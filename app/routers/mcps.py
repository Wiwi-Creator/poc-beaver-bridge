import asyncio
import logging
import time
from fastapi import APIRouter, Request, HTTPException, Query

from app.mcp.pool import MCPClientPool
from app.mcp.client import MCPClient
from app.metrics import metrics_store
from app import audit, pii, status_cache
from app.config import settings
from app.limiter import limiter
from app.registry.loader import load_registry, save_registry
from app.registry.models import MCPServerConfig, ServerAuth
from app.schemas.responses import (
    ServerStatus,
    TestConnectionResult,
    ToolInfo,
    ResourceInfo,
    PromptInfo,
    ToolCallRequest,
    ToolCallResponse,
    RegisterMCPRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mcps", tags=["mcp"])


def get_pool(request: Request) -> MCPClientPool:
    return request.app.state.mcp_pool


def _build_config(body: RegisterMCPRequest) -> MCPServerConfig:
    return MCPServerConfig(
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        url=body.url,
        transport=body.transport,
        auth=ServerAuth(
            type=body.auth_type,
            token=body.auth_token or None,
            audience=body.auth_audience or None,
        ),
        provider=body.provider,
        tags=body.tags,
        enabled=body.enabled,
        gcp_project=body.gcp_project or None,
    )


def _build_status(config: MCPServerConfig, status: str) -> ServerStatus:
    return ServerStatus(
        name=config.name,
        display_name=config.display_name,
        description=config.description,
        url=str(config.url),
        transport=config.transport,
        provider=config.provider,
        enabled=config.enabled,
        status=status,           # type: ignore[arg-type]
        tags=config.tags,
        auth_type=config.auth.type,
    )


async def _ping_soon(name: str, pool: MCPClientPool) -> None:
    """Background task: ping newly added server and update status cache."""
    try:
        client = pool.get(name)
        ok = await asyncio.wait_for(client.ping(), timeout=10.0)
        status_cache.set_status(name, "reachable" if ok else "unreachable")
    except Exception:
        status_cache.set_status(name, "unreachable")


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
        results = [_build_status(c, status_cache.get(c.name)) for c in configs]

    return list(results)


# ---------------------------------------------------------------------------
# Test Connection (before registering)
# ---------------------------------------------------------------------------

@router.post("/test", response_model=TestConnectionResult)
async def test_connection(body: RegisterMCPRequest):
    """
    Probe a MCP server URL without saving it.
    Used in the register modal to verify connectivity before committing.
    """
    config = _build_config(body)
    client = MCPClient(config)
    t0 = time.monotonic()
    try:
        tools = await asyncio.wait_for(client.list_tools(), timeout=8.0)
        latency = (time.monotonic() - t0) * 1000
        return TestConnectionResult(ok=True, tool_count=len(tools), latency_ms=round(latency, 1))
    except asyncio.TimeoutError:
        return TestConnectionResult(ok=False, error="Connection timed out (8s)")
    except Exception as e:
        return TestConnectionResult(ok=False, error=str(e))


# ---------------------------------------------------------------------------
# Register MCP
# ---------------------------------------------------------------------------

@router.post("", response_model=ServerStatus, status_code=201)
async def register_mcp(body: RegisterMCPRequest, request: Request):
    """Register a new MCP server (hot-reload, no restart needed)."""
    pool: MCPClientPool = get_pool(request)

    if body.name in {c.name for c in pool.all_configs()}:
        raise HTTPException(status_code=409, detail=f"MCP '{body.name}' already exists")

    config = _build_config(body)
    pool.add_server(config)
    status_cache.set_status(config.name, "unknown")

    # Persist to YAML
    registry = load_registry(settings.MCP_REGISTRY_PATH)
    registry.servers.append(config)
    save_registry(settings.MCP_REGISTRY_PATH, registry)

    # Fire-and-forget ping so status updates within ~10s
    asyncio.create_task(_ping_soon(config.name, pool))

    logger.info("Registered new MCP: %s (%s)", config.name, config.url)
    return _build_status(config, status_cache.get(config.name))


# ---------------------------------------------------------------------------
# Edit MCP
# ---------------------------------------------------------------------------

@router.put("/{name}", response_model=ServerStatus)
async def update_mcp(name: str, body: RegisterMCPRequest, request: Request):
    """Update an existing MCP server (hot-reload)."""
    pool: MCPClientPool = get_pool(request)

    existing_configs = {c.name: c for c in pool.all_configs()}
    if name not in existing_configs:
        raise HTTPException(status_code=404, detail=f"MCP '{name}' not found")

    # If bearer token left blank, keep the existing one
    existing_auth = existing_configs[name].auth
    if body.auth_type == "bearer" and not body.auth_token:
        body = body.model_copy(update={"auth_token": existing_auth.token})

    config = _build_config(body)

    # Hot-reload: swap out old for new
    pool.remove_server(name)
    pool.add_server(config)
    status_cache.set_status(name, "unknown")
    asyncio.create_task(_ping_soon(name, pool))

    # Persist to YAML
    registry = load_registry(settings.MCP_REGISTRY_PATH)
    registry.servers = [config if s.name == name else s for s in registry.servers]
    save_registry(settings.MCP_REGISTRY_PATH, registry)

    logger.info("Updated MCP: %s", name)
    return _build_status(config, status_cache.get(name))


# ---------------------------------------------------------------------------
# Delete MCP
# ---------------------------------------------------------------------------

@router.delete("/{name}", status_code=204)
async def delete_mcp(name: str, request: Request):
    """Remove an MCP server (hot-reload, no restart needed)."""
    pool: MCPClientPool = get_pool(request)

    if name not in {c.name for c in pool.all_configs()}:
        raise HTTPException(status_code=404, detail=f"MCP '{name}' not found")

    pool.remove_server(name)
    status_cache.remove_status(name)

    # Persist to YAML
    registry = load_registry(settings.MCP_REGISTRY_PATH)
    registry.servers = [s for s in registry.servers if s.name != name]
    save_registry(settings.MCP_REGISTRY_PATH, registry)

    logger.info("Deleted MCP: %s", name)


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

    # PII masking on response content
    masked_content = pii.mask_content([c.model_dump() for c in result.content])
    return ToolCallResponse(content=masked_content, is_error=is_error)


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
