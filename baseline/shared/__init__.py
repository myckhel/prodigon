"""
Shared module — cross-cutting concerns used by all services.

This module provides the foundational utilities that every service in the platform
depends on: configuration, logging, error handling, HTTP communication, and shared
data schemas.

Why this exists:
    In production multi-service systems, shared utilities prevent each service from
    reinventing logging formats, error structures, and config patterns. A shared
    module enforces consistency across the platform — when you see an error in logs,
    it looks the same whether it came from the gateway or the worker.
"""

from shared.config import BaseServiceSettings
from shared.errors import (
    AppError,
    InferenceError,
    JobNotFoundError,
    ServiceUnavailableError,
    ValidationError,
)
from shared.logging import get_logger
from shared.schemas import (
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    JobResponse,
    JobStatus,
    JobSubmission,
)

__all__ = [
    "BaseServiceSettings",
    "get_logger",
    "AppError",
    "InferenceError",
    "JobNotFoundError",
    "ServiceUnavailableError",
    "ValidationError",
    "GenerateRequest",
    "GenerateResponse",
    "HealthResponse",
    "JobResponse",
    "JobStatus",
    "JobSubmission",
]
