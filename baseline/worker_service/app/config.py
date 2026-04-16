"""
Worker Service configuration.

Extends base settings with queue and model service connection details.
"""

from shared.config import BaseServiceSettings
from shared.constants import DEFAULT_MODEL_SERVICE_URL


class WorkerServiceSettings(BaseServiceSettings):
    """Configuration for the Worker Service."""

    service_name: str = "worker-service"

    # Model service connection (for processing jobs)
    model_service_url: str = DEFAULT_MODEL_SERVICE_URL

    # Queue configuration
    queue_type: str = "memory"  # "memory" or "redis"
    redis_url: str = "redis://localhost:6379/0"

    # Worker behavior
    poll_interval: float = 1.0  # seconds between queue polls

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
