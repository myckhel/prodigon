"""
Job management endpoints — proxies to the Worker Service.

Exposes a clean public API for submitting and tracking background jobs,
while the actual queue management lives in the Worker Service.
"""

from fastapi import APIRouter, Depends

from api_gateway.app.dependencies import get_worker_client
from shared.http_client import ServiceClient
from shared.schemas import JobResponse, JobSubmission

router = APIRouter(prefix="/api/v1", tags=["jobs"])


@router.post("/jobs", response_model=JobResponse, status_code=202)
async def submit_job(
    submission: JobSubmission,
    worker_client: ServiceClient = Depends(get_worker_client),
):
    """Submit a batch of prompts for background processing.

    Returns 202 Accepted with a job_id. Poll GET /api/v1/jobs/{id} for results.
    """
    result = await worker_client.post("/jobs", json=submission.model_dump())
    return JobResponse(**result)


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    worker_client: ServiceClient = Depends(get_worker_client),
):
    """Check the status of a background job."""
    result = await worker_client.get(f"/jobs/{job_id}")
    return JobResponse(**result)
