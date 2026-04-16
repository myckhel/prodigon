"""
FastAPI dependencies for the API Gateway.

Manages HTTP clients for communicating with backend services.
"""

from functools import lru_cache

from api_gateway.app.config import GatewaySettings
from shared.http_client import ServiceClient


@lru_cache
def get_settings() -> GatewaySettings:
    return GatewaySettings()


_model_client: ServiceClient | None = None
_worker_client: ServiceClient | None = None


def init_dependencies(settings: GatewaySettings) -> tuple[ServiceClient, ServiceClient]:
    """Create service clients during app startup."""
    global _model_client, _worker_client

    _model_client = ServiceClient(base_url=settings.model_service_url)
    _worker_client = ServiceClient(base_url=settings.worker_service_url)

    return _model_client, _worker_client


def get_model_client() -> ServiceClient:
    if _model_client is None:
        raise RuntimeError("Model client not initialized.")
    return _model_client


def get_worker_client() -> ServiceClient:
    if _worker_client is None:
        raise RuntimeError("Worker client not initialized.")
    return _worker_client
