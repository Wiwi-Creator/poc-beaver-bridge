import json
import logging
from collections import deque
from datetime import datetime, timezone


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        return json.dumps(getattr(record, "payload", {}), ensure_ascii=False, default=str)


def _make_logger() -> logging.Logger:
    log = logging.getLogger("beaver_bridge.audit")
    log.setLevel(logging.INFO)
    log.propagate = False
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    log.addHandler(handler)
    return log


_log = _make_logger()

# In-memory ring buffer for UI display (最新在前)
_buffer: deque[dict] = deque(maxlen=200)


def get_recent(limit: int = 50) -> list[dict]:
    """Return the most recent audit events (newest first)."""
    events = list(_buffer)
    events.reverse()
    return events[:limit]


def _mask(key: str | None) -> str:
    if not key:
        return "—"
    return f"****{key[-4:]}" if len(key) > 4 else "****"


def log_tool_call(
    *,
    api_key: str | None,
    mcp_name: str,
    tool_name: str,
    latency_ms: float,
    is_error: bool,
    status_code: int,
) -> None:
    payload = {
        "event": "tool_call",
        "ts": datetime.now(timezone.utc).isoformat(),
        "api_key": _mask(api_key),
        "mcp": mcp_name,
        "tool": tool_name,
        "latency_ms": round(latency_ms, 1),
        "is_error": is_error,
        "status": status_code,
    }
    _buffer.append(payload)
    _log.info("", extra={"payload": payload})


def log_auth_failure(*, api_key: str | None, path: str, reason: str) -> None:
    """記錄一次認證失敗（missing key 或 invalid key）。"""
    payload = {
        "event": "auth_failure",
        "ts": datetime.now(timezone.utc).isoformat(),
        "api_key": _mask(api_key),
        "path": path,
        "reason": reason,
        "status": 401 if not api_key else 403,
    }
    _buffer.append(payload)
    _log.warning("", extra={"payload": payload})
