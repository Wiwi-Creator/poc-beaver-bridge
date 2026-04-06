"""
結構化稽核日誌（Structured Audit Log）。

每筆 log 輸出為一行 JSON，欄位如下：
  event      : "tool_call" | "auth_failure"
  ts         : ISO-8601 UTC 時間戳
  api_key    : 遮蔽後的 key（顯示末 4 碼，例如 ****ab12）
  mcp        : MCP server name（tool_call 專屬）
  tool       : tool name（tool_call 專屬）
  latency_ms : 執行時間 ms（tool_call 專屬）
  is_error   : MCP 層級是否回傳 error（tool_call 專屬）
  status     : HTTP status code
  path       : 請求路徑（auth_failure 專屬）
  reason     : 失敗原因（auth_failure 專屬）

日誌由獨立的 "beaver_bridge.audit" logger 輸出，不混入應用程式日誌。
"""
import json
import logging
from datetime import datetime, timezone


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        return json.dumps(getattr(record, "payload", {}), ensure_ascii=False, default=str)


def _make_logger() -> logging.Logger:
    log = logging.getLogger("beaver_bridge.audit")
    log.setLevel(logging.INFO)
    log.propagate = False  # 不往 root logger 傳，避免重複輸出
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    log.addHandler(handler)
    return log


_log = _make_logger()


def _mask(key: str | None) -> str:
    """遮蔽 API key，僅保留末 4 碼。"""
    if not key:
        return "—"
    return f"****{key[-4:]}" if len(key) > 4 else "****"


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def log_tool_call(
    *,
    api_key: str | None,
    mcp_name: str,
    tool_name: str,
    latency_ms: float,
    is_error: bool,
    status_code: int,
) -> None:
    """記錄一次 tool call（成功或失敗皆記錄）。"""
    _log.info(
        "",
        extra={
            "payload": {
                "event": "tool_call",
                "ts": datetime.now(timezone.utc).isoformat(),
                "api_key": _mask(api_key),
                "mcp": mcp_name,
                "tool": tool_name,
                "latency_ms": round(latency_ms, 1),
                "is_error": is_error,
                "status": status_code,
            }
        },
    )


def log_auth_failure(*, api_key: str | None, path: str, reason: str) -> None:
    """記錄一次認證失敗（missing key 或 invalid key）。"""
    _log.warning(
        "",
        extra={
            "payload": {
                "event": "auth_failure",
                "ts": datetime.now(timezone.utc).isoformat(),
                "api_key": _mask(api_key),
                "path": path,
                "reason": reason,
                "status": 401 if not api_key else 403,
            }
        },
    )
