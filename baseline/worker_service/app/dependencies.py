"""
FastAPI dependency injection for the Worker Service.

Manages the queue, processor, and service client instances.
"""

from functools import lru_cache

from shared.http_client import ServiceClient
from worker_service.app.config import WorkerServiceSettings
from worker_service.app.services.processor import JobProcessor
from worker_service.app.services.queue import BaseQueue, create_queue


@lru_cache
def get_settings() -> WorkerServiceSettings:
    return WorkerServiceSettings()


# Initialized during app lifespan
_queue: BaseQueue | None = None
_processor: JobProcessor | None = None
_model_client: ServiceClient | None = None


def init_dependencies(settings: WorkerServiceSettings) -> tuple[BaseQueue, JobProcessor, ServiceClient]:
    """Create all dependencies during app startup."""
    global _queue, _processor, _model_client

    _queue = create_queue(settings.queue_type)
    _model_client = ServiceClient(base_url=settings.model_service_url)
    _processor = JobProcessor(model_service_client=_model_client, queue=_queue)

    return _queue, _processor, _model_client


def get_queue() -> BaseQueue:
    if _queue is None:
        raise RuntimeError("Queue not initialized. App lifespan not started.")
    return _queue


def get_processor() -> JobProcessor:
    if _processor is None:
        raise RuntimeError("Processor not initialized. App lifespan not started.")
    return _processor


def get_model_client() -> ServiceClient:
    if _model_client is None:
        raise RuntimeError("Model client not initialized. App lifespan not started.")
    return _model_client
