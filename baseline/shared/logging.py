"""
Structured JSON logging using structlog.

Provides a consistent, machine-readable log format across all services.
Every log entry includes: timestamp, level, service name, and structured context.

Why structured logging:
    Plain text logs ("ERROR: something failed") are fine for local dev but unusable
    at scale. In production, logs go to aggregation systems (ELK, Datadog, CloudWatch)
    that need parseable JSON to enable filtering, alerting, and dashboarding.
"""

import logging
import sys

import structlog


def setup_logging(service_name: str, log_level: str = "INFO") -> None:
    """Configure structlog with JSON output for production, console for development."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer()
            if log_level == "DEBUG"
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Bind service name to all loggers from this point
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(service=service_name)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a named logger instance.

    Usage:
        logger = get_logger(__name__)
        logger.info("request_received", path="/generate", method="POST")
    """
    return structlog.get_logger(name)
