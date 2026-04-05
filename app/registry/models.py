from typing import Literal
from pydantic import BaseModel, HttpUrl, field_validator


class ServerAuth(BaseModel):
    type: Literal["google_access_token", "google_id_token", "bearer", "none"] = "none"
    audience: str | None = None  # For google_id_token: Cloud Run service URL
    token: str | None = None     # For bearer: static token


class MCPServerConfig(BaseModel):
    name: str
    display_name: str
    description: str | None = None
    url: HttpUrl
    transport: Literal["sse", "streamable_http"] = "sse"
    auth: ServerAuth = ServerAuth()
    gcp_project: str | None = None   # Injected as x-goog-user-project header
    provider: str = "Custom"         # e.g. "Google Cloud", "Databricks", "Custom"
    enabled: bool = True
    tags: list[str] = []
    timeout_seconds: int = 30

    @field_validator("name")
    @classmethod
    def name_must_be_slug(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9][a-z0-9\-]*$", v):
            raise ValueError("name must be lowercase alphanumeric with hyphens")
        return v


class MCPRegistry(BaseModel):
    servers: list[MCPServerConfig]
