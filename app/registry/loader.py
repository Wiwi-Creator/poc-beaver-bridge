import yaml
from pathlib import Path
from .models import MCPRegistry


def load_registry(path: str) -> MCPRegistry:
    registry_path = Path(path)
    if not registry_path.exists():
        raise FileNotFoundError(f"MCP registry not found: {path}")

    with registry_path.open() as f:
        data = yaml.safe_load(f)

    if not data or "servers" not in data:
        return MCPRegistry(servers=[])

    try:
        return MCPRegistry.model_validate(data)
    except Exception as e:
        raise ValueError(f"Invalid MCP registry config: {e}") from e


def save_registry(path: str, registry: MCPRegistry) -> None:
    """Persist the registry back to YAML. Called after hot-reload changes."""
    data = {
        "servers": [
            s.model_dump(mode="json", exclude_none=True)
            for s in registry.servers
        ]
    }
    with Path(path).open("w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
