"""
Async HTTP client wrapper for inter-service communication.

Wraps httpx.AsyncClient with timeouts, structured error handling, and logging.
All service-to-service HTTP calls go through this client.

Why a wrapper:
    Raw httpx calls scattered across the codebase lead to inconsistent timeout
    handling, missing error logging, and duplicated retry logic. Centralizing
    HTTP communication means one place to add retries, circuit breakers, or
    tracing headers later.
"""

import httpx

from shared.errors import ServiceUnavailableError
from shared.logging import get_logger

logger = get_logger(__name__)

DEFAULT_TIMEOUT = 30.0


class ServiceClient:
    """Async HTTP client for calling other services in the platform."""

    def __init__(self, base_url: str, timeout: float = DEFAULT_TIMEOUT):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def start(self) -> None:
        """Initialize the underlying HTTP client."""
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
        )
        logger.info("http_client_started", base_url=self.base_url)

    async def close(self) -> None:
        """Close the HTTP client and release connections."""
        if self._client:
            await self._client.aclose()
            logger.info("http_client_closed", base_url=self.base_url)

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("ServiceClient not started. Call start() first.")
        return self._client

    # REFACTOR TARGET: post() and get() share identical error-handling logic
    # (ConnectError, HTTPStatusError, TimeoutException). The only difference is
    # that post() logs the response body on HTTPStatusError. Extract a shared
    # _request() helper and call it from both methods.
    async def post(self, path: str, json: dict, headers: dict | None = None) -> dict:
        """Send a POST request and return the JSON response."""
        try:
            response = await self.client.post(path, json=json, headers=headers or {})
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError as exc:
            logger.error("service_connection_failed", url=f"{self.base_url}{path}", error=str(exc))
            raise ServiceUnavailableError(
                message="Cannot connect to service", service=self.base_url
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "service_request_failed",
                url=f"{self.base_url}{path}",
                status=exc.response.status_code,
                body=exc.response.text[:500],
            )
            raise
        except httpx.TimeoutException as exc:
            logger.error("service_timeout", url=f"{self.base_url}{path}")
            raise ServiceUnavailableError(
                message="Service request timed out", service=self.base_url
            ) from exc

    async def get(self, path: str, headers: dict | None = None) -> dict:
        """Send a GET request and return the JSON response."""
        try:
            response = await self.client.get(path, headers=headers or {})
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError as exc:
            logger.error("service_connection_failed", url=f"{self.base_url}{path}", error=str(exc))
            raise ServiceUnavailableError(
                message="Cannot connect to service", service=self.base_url
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error(
                "service_request_failed",
                url=f"{self.base_url}{path}",
                status=exc.response.status_code,
            )
            raise
        except httpx.TimeoutException as exc:
            logger.error("service_timeout", url=f"{self.base_url}{path}")
            raise ServiceUnavailableError(
                message="Service request timed out", service=self.base_url
            ) from exc
