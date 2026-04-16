"""
Job management endpoints — submit and track background jobs.

POST /jobs    — submit a batch of prompts for background processing
GET /jobs/{id} — check the status and retrieve results
"""

from fastapi import APIRouter, Depends, HTTPException

from shared.schemas import JobResponse, JobSubmission
from worker_service.app.dependencies import get_queue
from worker_service.app.services.queue import BaseQueue

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=202)
async def submit_job(
    submission: JobSubmission,
    queue: BaseQueue = Depends(get_queue),
):
    """Submit a batch of prompts for background processing.

    Returns 202 Accepted with a job_id for tracking. The worker processes
    prompts asynchronously — poll GET /jobs/{id} for status updates.
    """
    job = await queue.enqueue(submission)
    return job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    queue: BaseQueue = Depends(get_queue),
):
    """Check the status of a background job.

    Returns current status (pending/running/completed/failed),
    progress count, and results if completed.
    """
    job = await queue.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job
