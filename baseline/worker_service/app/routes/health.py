"""Health check endpoint for the Worker Service."""

from fastapi import APIRouter, Depends

from shared.schemas import HealthResponse
from worker_service.app.dependencies import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(settings=Depends(get_settings)):
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        environment=settings.environment,
    )
