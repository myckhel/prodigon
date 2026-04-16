"""
Model Service configuration.

Extends the base settings with Groq API credentials and inference defaults.
All values can be overridden via environment variables.
"""

from shared.config import BaseServiceSettings
from shared.constants import DEFAULT_MODEL, FALLBACK_MODEL


class ModelServiceSettings(BaseServiceSettings):
    """Configuration for the Model Service."""

    service_name: str = "model-service"

    # Groq API
    groq_api_key: str = ""
    default_model: str = DEFAULT_MODEL
    fallback_model: str = FALLBACK_MODEL

    # Inference defaults
    max_tokens: int = 1024
    temperature: float = 0.7

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
