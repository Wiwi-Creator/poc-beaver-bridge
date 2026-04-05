import asyncio
import logging
from fastapi import APIRouter, Request, HTTPException

from app.mcp.pool import MCPClientPool
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
async def list_mcps(request: Request):
    """List all registered MCP servers and their reachability status."""
    pool: MCPClientPool = get_pool(request)
    configs = pool.all_configs()

    async def check_status(config) -> ServerStatus:
        if not config.enabled:
            status = "disabled"
        else:
            try:
                client = pool.get(config.name)
                reachable = await client.ping()
                status = "reachable" if reachable else "unreachable"
            except Exception:
                status = "unreachable"

        return ServerStatus(
            name=config.name,
            display_name=config.display_name,
            description=config.description,
            url=str(config.url),
            transport=config.transport,
            enabled=config.enabled,
            status=status,
            tags=config.tags,
        )

    results = await asyncio.gather(*[check_status(c) for c in configs])
    return list(results)


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
async def call_tool(name: str, tool_name: str, body: ToolCallRequest, request: Request):
    """Invoke a tool on an MCP server."""
    pool: MCPClientPool = get_pool(request)
    client = pool.get(name)

    try:
        result = await client.call_tool(tool_name, body.arguments)
    except TimeoutError:
        raise HTTPException(status_code=504, detail=f"MCP server '{name}' timed out")
    except Exception as e:
        logger.exception("Error calling tool %s on %s", tool_name, name)
        raise HTTPException(status_code=502, detail=f"MCP server '{name}' error: {e}")

    return ToolCallResponse(
        content=[c.model_dump() for c in result.content],
        is_error=result.isError or False,
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
