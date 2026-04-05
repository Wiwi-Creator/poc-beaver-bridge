from typing import Any, Literal
from pydantic import BaseModel


class ServerStatus(BaseModel):
    name: str
    display_name: str
    description: str | None
    url: str
    transport: str
    enabled: bool
    status: Literal["reachable", "unreachable", "disabled"]
    tags: list[str]


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
