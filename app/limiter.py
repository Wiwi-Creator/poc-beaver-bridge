"""
Rate limiter singleton.

Key function: X-API-Key header（已驗證的 key）優先；
若走到此處前 auth middleware 已擋掉無效請求，
故此處 key 一定存在。保留 IP fallback 僅供 /health 等公開路徑。
"""
from slowapi import Limiter
from starlette.requests import Request


def _get_key(request: Request) -> str:
    return request.headers.get("X-API-Key") or (
        request.client.host if request.client else "unknown"
    )


limiter = Limiter(key_func=_get_key)
