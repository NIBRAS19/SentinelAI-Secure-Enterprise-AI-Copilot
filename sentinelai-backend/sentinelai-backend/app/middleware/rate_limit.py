"""Fixed-window rate limiting via Redis INCR+EXPIRE, keyed by client IP."""
import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._redis = None

    def _get_redis(self):
        if self._redis is None:
            import redis.asyncio as redis

            settings = get_settings()
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
        return self._redis

    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        client_ip = request.client.host if request.client else "unknown"
        window = int(time.time()) // settings.rate_limit_window_seconds
        key = f"ratelimit:{client_ip}:{window}"

        try:
            r = self._get_redis()
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, settings.rate_limit_window_seconds)
        except Exception:  # noqa: BLE001 - Redis being unavailable must not take the API down
            return await call_next(request)

        if count > settings.rate_limit_requests:
            return JSONResponse(
                status_code=429,
                content={"success": False, "error": {"code": "RATE_LIMITED", "message": "Too many requests. Please slow down."}},
            )
        return await call_next(request)
