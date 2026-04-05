import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.registry.models import MCPRegistry, MCPServerConfig, ServerAuth

_TEST_REGISTRY = MCPRegistry(
    servers=[
        MCPServerConfig(
            name="test-mcp",
            display_name="Test MCP",
            url="http://localhost:9999/sse",
            transport="sse",
            auth=ServerAuth(type="none"),
            enabled=True,
            tags=["test"],
        )
    ]
)


@pytest.fixture
def test_client(monkeypatch):
    monkeypatch.setenv("API_KEYS", "test-key")

    # Patch registry loader so lifespan uses our test registry
    with patch("app.main.load_registry", return_value=_TEST_REGISTRY):
        from app.main import app
        with TestClient(app) as client:
            # Mock the client methods on the pool that was created during lifespan
            pool = app.state.mcp_pool
            mcp_client = pool.get("test-mcp")
            mcp_client.list_tools = AsyncMock(return_value=[])
            mcp_client.list_resources = AsyncMock(return_value=[])
            mcp_client.list_prompts = AsyncMock(return_value=[])
            mcp_client.ping = AsyncMock(return_value=True)
            yield client
