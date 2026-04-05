from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Comma-separated API keys: "key1,key2,key3"
    API_KEYS: str
    MCP_REGISTRY_PATH: str = "config/mcp_servers.yaml"
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def api_keys_set(self) -> set[str]:
        return {k.strip() for k in self.API_KEYS.split(",") if k.strip()}


settings = Settings()
