from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Comma-separated API keys: "key1,key2,key3"
    API_KEYS: str
    MCP_REGISTRY_PATH: str = "config/mcp_servers.yaml"
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"
    # slowapi 格式，例如 "60/minute"、"10/second"
    RATE_LIMIT_TOOL_CALL: str = "60/minute"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def api_keys_set(self) -> set[str]:
        return {k.strip() for k in self.API_KEYS.split(",") if k.strip()}


settings = Settings()
