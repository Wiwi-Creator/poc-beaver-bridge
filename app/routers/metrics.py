from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.metrics import metrics_store

router = APIRouter(prefix="/metrics", tags=["observability"])


class ToolMetricsOut(BaseModel):
    tool_name: str
    call_count: int
    error_count: int
    error_rate: float
    avg_latency_ms: float
    last_called: datetime | None


class MCPMetricsOut(BaseModel):
    mcp_name: str
    call_count: int
    error_count: int
    error_rate: float
    avg_latency_ms: float
    last_called: datetime | None
    top_tools: list[ToolMetricsOut]


class SummaryOut(BaseModel):
    total_calls: int
    total_errors: int
    active_mcps: int
    mcps: list[MCPMetricsOut]


@router.get("", response_model=SummaryOut)
async def get_metrics():
    """Overall usage summary across all MCPs."""
    summary = metrics_store.summary()
    mcps = [
        MCPMetricsOut(
            mcp_name=m.mcp_name,
            call_count=m.call_count,
            error_count=m.error_count,
            error_rate=m.error_rate,
            avg_latency_ms=m.avg_latency_ms,
            last_called=m.last_called,
            top_tools=sorted(
                [
                    ToolMetricsOut(
                        tool_name=t.tool_name,
                        call_count=t.call_count,
                        error_count=t.error_count,
                        error_rate=t.error_rate,
                        avg_latency_ms=t.avg_latency_ms,
                        last_called=t.last_called,
                    )
                    for t in m.tools.values()
                ],
                key=lambda x: x.call_count,
                reverse=True,
            )[:5],
        )
        for m in metrics_store.get_all()
    ]
    return SummaryOut(mcps=mcps, **summary)


@router.get("/{mcp_name}", response_model=MCPMetricsOut)
async def get_mcp_metrics(mcp_name: str):
    """Per-MCP usage with full tool breakdown."""
    m = metrics_store.get(mcp_name)
    if not m:
        raise HTTPException(status_code=404, detail=f"No metrics for '{mcp_name}' yet")
    return MCPMetricsOut(
        mcp_name=m.mcp_name,
        call_count=m.call_count,
        error_count=m.error_count,
        error_rate=m.error_rate,
        avg_latency_ms=m.avg_latency_ms,
        last_called=m.last_called,
        top_tools=sorted(
            [
                ToolMetricsOut(
                    tool_name=t.tool_name,
                    call_count=t.call_count,
                    error_count=t.error_count,
                    error_rate=t.error_rate,
                    avg_latency_ms=t.avg_latency_ms,
                    last_called=t.last_called,
                )
                for t in m.tools.values()
            ],
            key=lambda x: x.call_count,
            reverse=True,
        ),
    )
