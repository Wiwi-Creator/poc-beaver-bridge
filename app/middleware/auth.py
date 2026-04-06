import hmac
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app import audit

# Endpoints that bypass authentication (e.g. liveness probes)
_PUBLIC_PATHS = {"/health", "/", "/docs", "/redoc", "/openapi.json"}


class APIKeyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, api_keys: list[str]):
        super().__init__(app)
        self._keys: set[str] = set(api_keys)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        key = request.headers.get("X-API-Key")
        if not key:
            audit.log_auth_failure(api_key=None, path=request.url.path, reason="missing_key")
            return JSONResponse({"detail": "Missing API key"}, status_code=401)

        # Constant-time comparison to prevent timing attacks
        if not any(hmac.compare_digest(key, k) for k in self._keys):
            audit.log_auth_failure(api_key=key, path=request.url.path, reason="invalid_key")
            return JSONResponse({"detail": "Invalid API key"}, status_code=403)

        return await call_next(request)
