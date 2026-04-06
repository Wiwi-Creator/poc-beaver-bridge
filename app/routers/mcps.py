import asyncio
import logging
import time
from fastapi import APIRouter, Request, HTTPException, Query

from app.mcp.pool import MCPClientPool
from app.metrics import metrics_store
from app import audit, status_cache
from app.config import settings
from app.limiter import limiter
from app.schemas.responses import (
    ServerStatus,
    ToolInfo,
    ResourceInfo,
    PromptInfo,
    ToolCallRequest,
    ToolCallResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mcps", tags=["mcp"])


def get_pool(request: Request) -> MCPClientPool:
    return request.app.state.mcp_pool


# ---------------------------------------------------------------------------
# List all MCP servers with live status
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ServerStatus])
async def list_mcps(
    request: Request,
    live: bool = Query(False, description="Force live ping instead of reading cache"),
):
    """
    List all registered MCP servers.
    By default reads from the status cache (fast, ~instant).
    Pass ?live=true to force real-time ping of all servers.
    """
    pool: MCPClientPool = get_pool(request)
    configs = pool.all_configs()

    if live:
        # Full live ping — slow but accurate
        async def check_live(config) -> ServerStatus:
            if not config.enabled:
                cached = "disabled"
            else:
                try:
                    ok = await pool.get(config.name).ping()
                    cached = "reachable" if ok else "unreachable"
                except Exception:
                    cached = "unreachable"
            status_cache.set_status(config.name, cached)
            return _build_status(config, cached)

        results = await asyncio.gather(*[check_live(c) for c in configs])
    else:
        # Read from cache — instant
        results = [_build_status(c, status_cache.get(c.name)) for c in configs]

    return list(results)


def _build_status(config, status: str) -> ServerStatus:
    return ServerStatus(
        name=config.name,
        display_name=config.display_name,
        description=config.description,
        url=str(config.url),
        transport=config.transport,
        provider=config.provider,
        enabled=config.enabled,
        status=status,  # type: ignore[arg-type]
        tags=config.tags,
    )


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@router.get("/{name}/tools", response_model=list[ToolInfo])
async def list_tools(name: str, request: Request):
    """List all tools exposed by an MCP server."""
    pool: MCPClientPool = get_pool(request)
    client = pool.get(name)

    try:
        tools = await client.list_tools()
    except TimeoutError:
        raise HTTPException(status_code=504, detail=f"MCP server '{name}' timed out")
    except Exception as e:
        logger.exception("Error listing tools from %s", name)
        raise HTTPException(status_code=502, detail=f"MCP server '{name}' error: {e}")

    return [
        ToolInfo(
            name=t.name,
            description=t.description,
            input_schema=t.inputSchema if isinstance(t.inputSchema, dict) else t.inputSchema.model_dump(),
        )
        for t in tools
    ]


@router.post("/{name}/tools/{tool_name}/call", response_model=ToolCallResponse)
@limiter.limit(lambda: settings.RATE_LIMIT_TOOL_CALL)
async def call_tool(name: str, tool_name: str, body: ToolCallRequest, request: Request):
    """Invoke a tool on an MCP server."""
    pool: MCPClientPool = get_pool(request)
    client = pool.get(name)
    api_key = request.headers.get("X-API-Key")

    t0 = time.monotonic()
    is_error = False
    try:
        result = await client.call_tool(tool_name, body.arguments)
        is_error = result.isError or False
    except TimeoutError:
        latency = (time.monotonic() - t0) * 1000
        metrics_store.record(name, tool_name, latency, True)
        audit.log_tool_call(
            api_key=api_key, mcp_name=name, tool_name=tool_name,
            latency_ms=latency, is_error=True, status_code=504,
        )
        raise HTTPException(status_code=504, detail=f"MCP server '{name}' timed out")
    except Exception as e:
        latency = (time.monotonic() - t0) * 1000
        logger.exception("Error calling tool %s on %s", tool_name, name)
        metrics_store.record(name, tool_name, latency, True)
        audit.log_tool_call(
            api_key=api_key, mcp_name=name, tool_name=tool_name,
            latency_ms=latency, is_error=True, status_code=502,
        )
        raise HTTPException(status_code=502, detail=f"MCP server '{name}' error: {e}")

    latency = (time.monotonic() - t0) * 1000
    metrics_store.record(name, tool_name, latency, is_error)
    audit.log_tool_call(
        api_key=api_key, mcp_name=name, tool_name=tool_name,
        latency_ms=latency, is_error=is_error, status_code=200,
    )
    return ToolCallResponse(
        content=[c.model_dump() for c in result.content],
        is_error=is_error,
    )


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------

@router.get("/{name}/resources", response_model=list[ResourceInfo])
async def list_resources(name: str, request: Request):
    """List all resources exposed by an MCP server."""
    pool: MCPClientPool = get_pool(request)
    client = pool.get(name)

    try:
        resources = await client.list_resources()
    except TimeoutError:
        raise HTTPException(status_code=504, detail=f"MCP server '{name}' timed out")
    except Exception as e:
        logger.exception("Error listing resources from %s", name)
        raise HTTPException(status_code=502, detail=f"MCP server '{name}' error: {e}")

    return [
        ResourceInfo(
            uri=str(r.uri),
            name=r.name,
            description=r.description,
            mime_type=r.mimeType,
        )
        for r in resources
    ]


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

@router.get("/{name}/prompts", response_model=list[PromptInfo])
async def list_prompts(name: str, request: Request):
    """List all prompts exposed by an MCP server."""
    pool: MCPClientPool = get_pool(request)
    client = pool.get(name)

    try:
        prompts = await client.list_prompts()
    except TimeoutError:
        raise HTTPException(status_code=504, detail=f"MCP server '{name}' timed out")
    except Exception as e:
        logger.exception("Error listing prompts from %s", name)
        raise HTTPException(status_code=502, detail=f"MCP server '{name}' error: {e}")

    return [PromptInfo(name=p.name, description=p.description) for p in prompts]
