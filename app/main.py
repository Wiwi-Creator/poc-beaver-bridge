import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.limiter import limiter
from app.middleware.auth import APIKeyMiddleware
from app.mcp.pool import MCPClientPool
from app.registry.loader import load_registry
from app import status_cache
from app.routers.health import router as health_router
from app.routers.mcps import router as mcps_router
from app.routers.metrics import router as metrics_router

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
    pool = MCPClientPool(registry)
    app.state.mcp_pool = pool
    await status_cache.start_background_refresh(pool)
    yield
    status_cache.stop()
    logger.info("Shutting down")


app = FastAPI(
    title="Beaver Bridge",
    description="Central API gateway bridging multiple MCP servers",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiting（slowapi）
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# API Key 認證
app.add_middleware(APIKeyMiddleware, api_keys=list(settings.api_keys_set))

app.include_router(health_router)
app.include_router(mcps_router, prefix="/api/v1")
app.include_router(metrics_router, prefix="/api/v1")
