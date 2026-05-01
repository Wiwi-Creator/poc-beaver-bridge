from slowapi import Limiter
from starlette.requests import Request


def _get_key(request: Request) -> str:
    return request.headers.get("X-API-Key") or (
        request.client.host if request.client else "unknown"
    )


limiter = Limiter(key_func=_get_key)
