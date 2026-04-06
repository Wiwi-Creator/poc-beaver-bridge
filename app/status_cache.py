"""
Background status cache for MCP server reachability.
Pings all servers once at startup and every REFRESH_INTERVAL seconds.
The /mcps endpoint reads from cache instead of live-pinging.
"""
import asyncio
import logging
import time
from typing import Literal

logger = logging.getLogger(__name__)

REFRESH_INTERVAL = 60  # seconds

StatusType = Literal["reachable", "unreachable", "disabled", "unknown"]

# name -> (status, checked_at)
_cache: dict[str, tuple[StatusType, float]] = {}
_refresh_task: asyncio.Task | None = None


def get(name: str) -> StatusType:
    entry = _cache.get(name)
    return entry[0] if entry else "unknown"


def set_status(name: str, status: StatusType):
    _cache[name] = (status, time.time())


def cache_age(name: str) -> float | None:
    entry = _cache.get(name)
    return time.time() - entry[1] if entry else None


async def refresh_all(pool) -> None:
    """Ping all enabled servers and update cache."""
    configs = pool.all_configs()
    enabled = [c for c in configs if c.enabled]

    async def ping_one(config):
        try:
            client = pool.get(config.name)
            ok = await client.ping()
            set_status(config.name, "reachable" if ok else "unreachable")
        except Exception as e:
            logger.debug("Status check failed for %s: %s", config.name, e)
            set_status(config.name, "unreachable")

    # Mark disabled servers immediately
    for c in configs:
        if not c.enabled:
            set_status(c.name, "disabled")

    await asyncio.gather(*[ping_one(c) for c in enabled])
    logger.info("Status cache refreshed: %d servers checked", len(enabled))


async def start_background_refresh(pool) -> None:
    """Run initial refresh then schedule periodic updates."""
    global _refresh_task

    # Initial ping (non-blocking — don't await, let it run behind the scenes)
    async def _loop():
        while True:
            try:
                await refresh_all(pool)
            except Exception as e:
                logger.warning("Status refresh error: %s", e)
            await asyncio.sleep(REFRESH_INTERVAL)

    _refresh_task = asyncio.create_task(_loop())
    logger.info("Status cache background refresh started (every %ds)", REFRESH_INTERVAL)


def remove_status(name: str) -> None:
    _cache.pop(name, None)


def stop():
    global _refresh_task
    if _refresh_task:
        _refresh_task.cancel()
        _refresh_task = None
