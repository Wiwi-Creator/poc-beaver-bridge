import time
import asyncio
import logging
from typing import Any

from mcp import ClientSession
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamablehttp_client
from mcp.types import Tool, Resource, Prompt, CallToolResult

from app.registry.models import MCPServerConfig

logger = logging.getLogger(__name__)

# Token caches: key -> (token, expiry_timestamp)
_id_token_cache: dict[str, tuple[str, float]] = {}
_access_token_cache: tuple[str, float] | None = None



def _fetch_access_token_sync() -> tuple[str, float]:
    """Fetch an ADC access token. Returns (token, expiry_timestamp)."""
    import google.auth
    import google.auth.transport.requests

    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    req = google.auth.transport.requests.Request()
    creds.refresh(req)
    expiry = creds.expiry.timestamp() if creds.expiry else time.time() + 3600
    return creds.token, expiry


def _fetch_id_token_sync(audience: str) -> str:
    import google.auth.transport.requests
    import google.oauth2.id_token

    request = google.auth.transport.requests.Request()
    return google.oauth2.id_token.fetch_id_token(request, audience)


async def _get_access_token() -> str:
    global _access_token_cache
    if _access_token_cache:
        token, expiry = _access_token_cache
        if time.time() < expiry - 60:
            return token
    loop = asyncio.get_event_loop()
    token, expiry = await loop.run_in_executor(None, _fetch_access_token_sync)
    _access_token_cache = (token, expiry)
    return token


async def _get_id_token(audience: str) -> str:
    cached = _id_token_cache.get(audience)
    if cached:
        token, expiry = cached
        if time.time() < expiry - 60:
            return token
    loop = asyncio.get_event_loop()
    token = await loop.run_in_executor(None, _fetch_id_token_sync, audience)
    _id_token_cache[audience] = (token, time.time() + 3600)
    return token


# ---------------------------------------------------------------------------
# MCPClient
# ---------------------------------------------------------------------------

class MCPClient:
    def __init__(self, config: MCPServerConfig):
        self.config = config

    async def _auth_headers(self) -> dict[str, str]:
        auth = self.config.auth
        headers: dict[str, str] = {}

        if auth.type == "google_access_token":
            token = await _get_access_token()
            headers["Authorization"] = f"Bearer {token}"
        elif auth.type == "google_id_token":
            audience = auth.audience or str(self.config.url)
            token = await _get_id_token(audience)
            headers["Authorization"] = f"Bearer {token}"
        elif auth.type == "bearer" and auth.token:
            headers["Authorization"] = f"Bearer {auth.token}"

        # GCP quota/billing project header (required for Google APIs)
        if self.config.gcp_project:
            headers["x-goog-user-project"] = self.config.gcp_project

        return headers

    def _transport(self, headers: dict[str, str]):
        url = str(self.config.url)
        if self.config.transport == "streamable_http":
            return streamablehttp_client(url, headers=headers)
        return sse_client(url, headers=headers)

    async def list_tools(self) -> list[Tool]:
        headers = await self._auth_headers()
        async with self._transport(headers) as (read, write, *_):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.list_tools()
                return result.tools

    async def list_resources(self) -> list[Resource]:
        headers = await self._auth_headers()
        async with self._transport(headers) as (read, write, *_):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.list_resources()
                return result.resources

    async def list_prompts(self) -> list[Prompt]:
        headers = await self._auth_headers()
        async with self._transport(headers) as (read, write, *_):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.list_prompts()
                return result.prompts

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> CallToolResult:
        headers = await self._auth_headers()
        async with self._transport(headers) as (read, write, *_):
            async with ClientSession(read, write) as session:
                await session.initialize()
                return await session.call_tool(tool_name, arguments)

    async def ping(self) -> bool:
        """Check reachability by attempting list_tools with a short timeout."""
        try:
            await asyncio.wait_for(self.list_tools(), timeout=8.0)
            return True
        except Exception as e:
            logger.debug("Ping failed for %s: %s", self.config.name, e)
            return False
