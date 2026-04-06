from fastapi import HTTPException

from app.registry.models import MCPRegistry, MCPServerConfig
from .client import MCPClient


class MCPClientPool:
    def __init__(self, registry: MCPRegistry):
        self._clients: dict[str, MCPClient] = {}
        self._configs: dict[str, MCPServerConfig] = {}

        for server in registry.servers:
            self._configs[server.name] = server
            if server.enabled:
                self._clients[server.name] = MCPClient(server)

    def get(self, name: str) -> MCPClient:
        config = self._configs.get(name)
        if config is None:
            raise HTTPException(status_code=404, detail=f"MCP server '{name}' not found")
        if not config.enabled:
            raise HTTPException(status_code=503, detail=f"MCP server '{name}' is disabled")
        return self._clients[name]

    def all_configs(self) -> list[MCPServerConfig]:
        return list(self._configs.values())

    def add_server(self, config: MCPServerConfig) -> None:
        """Hot-add a new MCP server without restarting."""
        self._configs[config.name] = config
        if config.enabled:
            self._clients[config.name] = MCPClient(config)

    def remove_server(self, name: str) -> None:
        """Hot-remove an MCP server without restarting."""
        self._configs.pop(name, None)
        self._clients.pop(name, None)
