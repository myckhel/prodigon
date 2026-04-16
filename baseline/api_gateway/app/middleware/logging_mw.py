"""
Structured request/response logging middleware.

Logs every request with method, path, status code, and a request_id for
end-to-end tracing across services.

Why request logging:
    In a multi-service system, a single user action triggers calls across
    multiple services. Without a shared request_id, correlating logs from
    the gateway, model service, and worker is like finding a needle in a haystack.
"""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from shared.logging import get_logger

logger = get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate or propagate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        logger.info(
            "request_started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client=request.client.host if request.client else "unknown",
        )

        response = await call_next(request)

        # Attach request ID to response for client correlation
        response.headers["X-Request-ID"] = request_id

        logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
        )

        return response
