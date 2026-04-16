"""
API Gateway configuration.

The gateway needs to know how to reach the backend services and which
origins to allow for CORS.
"""

from shared.config import BaseServiceSettings
from shared.constants import DEFAULT_MODEL_SERVICE_URL, DEFAULT_WORKER_SERVICE_URL


class GatewaySettings(BaseServiceSettings):
    """Configuration for the API Gateway."""

    service_name: str = "api-gateway"

    # Backend service URLs
    model_service_url: str = DEFAULT_MODEL_SERVICE_URL
    worker_service_url: str = DEFAULT_WORKER_SERVICE_URL

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]
