"""
Text generation endpoint — proxies requests to the Model Service.

The gateway doesn't perform inference itself. It validates the request,
adds observability headers (request_id), and forwards to the model service.
This is the API Gateway pattern: a single entry point that routes, validates,
and decorates requests before they reach backend services.
"""

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from api_gateway.app.dependencies import get_model_client, get_settings
from shared.http_client import ServiceClient
from shared.schemas import GenerateRequest, GenerateResponse

router = APIRouter(prefix="/api/v1", tags=["generation"])


@router.post("/generate", response_model=GenerateResponse)
async def generate_text(
    request: GenerateRequest,
    model_client: ServiceClient = Depends(get_model_client),
):
    """Generate text from a prompt.

    Proxies the request to the Model Service which handles model selection,
    Groq API calls, and fallback logic.
    """
    result = await model_client.post(
        "/inference",
        json=request.model_dump(),
    )
    return GenerateResponse(**result)


@router.post("/generate/stream")
async def generate_text_stream(
    request: GenerateRequest,
    settings=Depends(get_settings),
):
    """Stream generated text token-by-token via Server-Sent Events.

    Proxies the SSE stream from the Model Service to the client.
    Uses a raw httpx streaming request since ServiceClient expects JSON.
    """

    async def proxy_stream():
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
            async with client.stream(
                "POST",
                f"{settings.model_service_url}/inference/stream",
                json=request.model_dump(),
            ) as response:
                async for chunk in response.aiter_bytes():
                    yield chunk

    return StreamingResponse(
        proxy_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
