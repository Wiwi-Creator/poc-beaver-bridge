import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.middleware.auth import APIKeyMiddleware
from app.mcp.pool import MCPClientPool
from app.registry.loader import load_registry
from app.routers.health import router as health_router
from app.routers.mcps import router as mcps_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading MCP registry from %s", settings.MCP_REGISTRY_PATH)
    registry = load_registry(settings.MCP_REGISTRY_PATH)
    enabled = sum(1 for s in registry.servers if s.enabled)
    logger.info("Registry loaded: %d servers (%d enabled)", len(registry.servers), enabled)
    app.state.mcp_pool = MCPClientPool(registry)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Beaver Bridge",
    description="Central API gateway bridging multiple MCP servers",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(APIKeyMiddleware, api_keys=list(settings.api_keys_set))

app.include_router(health_router)
app.include_router(mcps_router, prefix="/api/v1")
