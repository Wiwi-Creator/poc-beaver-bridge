from typing import Any, Literal
from pydantic import BaseModel


class ServerStatus(BaseModel):
    name: str
    display_name: str
    description: str | None
    url: str
    transport: str
    provider: str
    enabled: bool
    status: Literal["reachable", "unreachable", "disabled", "unknown"]
    tags: list[str]


class RegisterMCPRequest(BaseModel):
    name: str
    display_name: str
    description: str | None = None
    url: str
    transport: Literal["sse", "streamable_http"] = "streamable_http"
    auth_type: Literal["none", "bearer", "google_access_token", "google_id_token"] = "none"
    auth_token: str | None = None      # bearer token
    auth_audience: str | None = None   # google_id_token audience
    provider: str = "Local"
    tags: list[str] = []
    enabled: bool = True
    gcp_project: str | None = None


class ToolInfo(BaseModel):
    name: str
    description: str | None
    input_schema: dict[str, Any]


class ResourceInfo(BaseModel):
    uri: str
    name: str | None
    description: str | None
    mime_type: str | None


class PromptInfo(BaseModel):
    name: str
    description: str | None


class ToolCallRequest(BaseModel):
    arguments: dict[str, Any] = {}


class ToolCallResponse(BaseModel):
    content: list[dict[str, Any]]
    is_error: bool = False
