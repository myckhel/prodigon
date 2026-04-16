"""
FastAPI dependency injection for the Model Service.

Dependencies are initialized once during app lifespan and injected into
route handlers via FastAPI's Depends() mechanism. This gives us:
  - Single instance of expensive objects (Groq client, settings)
  - Easy testing (override dependencies with mocks)
  - Clean separation between configuration and business logic

Why dependency injection:
    Without DI, route handlers create their own clients, read their own config,
    and become impossible to test in isolation. DI inverts that — handlers declare
    what they need, and the framework provides it.
"""

from functools import lru_cache

from model_service.app.config import ModelServiceSettings
from model_service.app.services.groq_client import GroqInferenceClient, MockGroqClient
from model_service.app.services.model_manager import ModelManager


@lru_cache
def get_settings() -> ModelServiceSettings:
    """Cached settings — loaded once, reused across requests."""
    return ModelServiceSettings()


# These will be initialized in the lifespan and stored here
_model_manager: ModelManager | None = None


def init_dependencies(settings: ModelServiceSettings) -> ModelManager:
    """Create all dependencies during app startup. Called from lifespan."""
    global _model_manager

    if settings.use_mock:
        client = MockGroqClient()
    else:
        client = GroqInferenceClient(api_key=settings.groq_api_key)

    _model_manager = ModelManager(
        groq_client=client,
        default_model=settings.default_model,
        fallback_model=settings.fallback_model,
    )
    return _model_manager


def get_model_manager() -> ModelManager:
    """Inject the ModelManager into route handlers."""
    if _model_manager is None:
        raise RuntimeError("ModelManager not initialized. App lifespan not started.")
    return _model_manager
