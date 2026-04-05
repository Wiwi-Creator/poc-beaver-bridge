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
