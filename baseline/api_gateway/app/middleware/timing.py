"""
Request timing middleware.

Measures how long each request takes and adds an X-Process-Time header to the
response. Also logs slow requests for alerting.

Why timing middleware:
    Without request-level timing, you're blind to latency regressions. This
    middleware gives you per-request latency in both logs and response headers,
    which is the foundation for SLO monitoring (e.g., "99% of requests under 500ms").
"""

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from shared.logging import get_logger

logger = get_logger(__name__)

SLOW_REQUEST_THRESHOLD_MS = 2000


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

        if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(
                "slow_request",
                path=request.url.path,
                method=request.method,
                duration_ms=round(duration_ms, 2),
            )

        return response
