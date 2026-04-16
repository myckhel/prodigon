"""Health check endpoint for the Model Service."""

from fastapi import APIRouter, Depends

from model_service.app.dependencies import get_settings
from shared.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(settings=Depends(get_settings)):
    """Return service health status.

    Used by load balancers, orchestrators (K8s), and monitoring
    to determine if this instance can receive traffic.
    """
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        environment=settings.environment,
    )
