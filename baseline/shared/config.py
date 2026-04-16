"""
Base configuration using Pydantic Settings.

Every service inherits from BaseServiceSettings, which reads environment variables
and provides sensible defaults. This pattern ensures:
  - All config is env-driven (12-factor app)
  - Type validation at startup (fail fast on bad config)
  - Each service can extend with its own fields

Why Pydantic Settings:
    Unlike raw os.environ, Pydantic Settings gives you type coercion, validation,
    and documentation in one place. A typo in an env var becomes a startup error
    instead of a runtime surprise.
"""

from pydantic_settings import BaseSettings


class BaseServiceSettings(BaseSettings):
    """Base configuration shared by all services."""

    # Service identity
    service_name: str = "unknown"
    environment: str = "development"

    # Logging
    log_level: str = "INFO"

    # Mock mode — bypass external APIs for offline/testing
    use_mock: bool = False

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }
