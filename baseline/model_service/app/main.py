"""
Model Service — FastAPI application entry point.

This service handles all LLM inference for the platform. It wraps the Groq API
behind a clean REST interface and provides model selection, fallback logic,
and structured logging.

Run directly:
    cd baseline && uvicorn model_service.app.main:app --port 8001 --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from model_service.app.dependencies import get_settings, init_dependencies
from model_service.app.routes import health, inference
from shared.errors import AppError
from shared.logging import get_logger, setup_logging

settings = get_settings()
setup_logging(settings.service_name, settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize dependencies on startup, clean up on shutdown."""
    logger.info("model_service_starting", environment=settings.environment)
    init_dependencies(settings)
    logger.info("model_service_ready")
    yield
    logger.info("model_service_shutting_down")


app = FastAPI(
    title="Model Service",
    description="LLM inference service powered by Groq API",
    version="0.1.0",
    lifespan=lifespan,
)

# Register routes
app.include_router(health.router, tags=["health"])
app.include_router(inference.router, tags=["inference"])


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """Convert application errors to structured JSON responses."""
    logger.error(
        "app_error",
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
            }
        },
    )
