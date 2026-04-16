"""Health check endpoint for the API Gateway."""

from fastapi import APIRouter, Depends

from api_gateway.app.dependencies import get_settings
from shared.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(settings=Depends(get_settings)):
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        environment=settings.environment,
    )
