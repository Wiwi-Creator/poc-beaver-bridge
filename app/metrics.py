"""
In-memory metrics store.
Records call count, error count, latency, and last_called per MCP and tool.
Thread-safe via asyncio (single-threaded event loop).
"""
import time
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ToolMetrics:
    mcp_name: str
    tool_name: str
    call_count: int = 0
    error_count: int = 0
    total_latency_ms: float = 0.0
    last_called: datetime | None = None

    @property
    def avg_latency_ms(self) -> float:
        if self.call_count == 0:
            return 0.0
        return round(self.total_latency_ms / self.call_count, 1)

    @property
    def error_rate(self) -> float:
        if self.call_count == 0:
            return 0.0
        return round(self.error_count / self.call_count, 3)


@dataclass
class MCPMetrics:
    mcp_name: str
    call_count: int = 0
    error_count: int = 0
    total_latency_ms: float = 0.0
    last_called: datetime | None = None
    tools: dict[str, ToolMetrics] = field(default_factory=dict)

    @property
    def avg_latency_ms(self) -> float:
        if self.call_count == 0:
            return 0.0
        return round(self.total_latency_ms / self.call_count, 1)

    @property
    def error_rate(self) -> float:
        if self.call_count == 0:
            return 0.0
        return round(self.error_count / self.call_count, 3)


class MetricsStore:
    def __init__(self):
        self._mcps: dict[str, MCPMetrics] = {}

    def record(self, mcp_name: str, tool_name: str, latency_ms: float, is_error: bool):
        # MCP level
        if mcp_name not in self._mcps:
            self._mcps[mcp_name] = MCPMetrics(mcp_name=mcp_name)
        m = self._mcps[mcp_name]
        m.call_count += 1
        m.total_latency_ms += latency_ms
        m.last_called = datetime.utcnow()
        if is_error:
            m.error_count += 1

        # Tool level
        key = tool_name
        if key not in m.tools:
            m.tools[key] = ToolMetrics(mcp_name=mcp_name, tool_name=tool_name)
        t = m.tools[key]
        t.call_count += 1
        t.total_latency_ms += latency_ms
        t.last_called = datetime.utcnow()
        if is_error:
            t.error_count += 1

    def get_all(self) -> list[MCPMetrics]:
        return sorted(self._mcps.values(), key=lambda m: m.call_count, reverse=True)

    def get(self, mcp_name: str) -> MCPMetrics | None:
        return self._mcps.get(mcp_name)

    def summary(self) -> dict:
        all_m = self._mcps.values()
        total_calls = sum(m.call_count for m in all_m)
        total_errors = sum(m.error_count for m in all_m)
        return {
            "total_calls": total_calls,
            "total_errors": total_errors,
            "active_mcps": sum(1 for m in all_m if m.call_count > 0),
        }


# Singleton
metrics_store = MetricsStore()
