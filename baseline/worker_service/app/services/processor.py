"""
Job processor — executes batch inference jobs.

Takes a JobSubmission (list of prompts), calls the Model Service for each one
via HTTP, and collects results. Updates job status as it progresses.

Why HTTP instead of direct import:
    The processor calls Model Service over HTTP, not by importing its code.
    This enforces service boundaries — in production, these run in separate
    containers. If you import directly, you lose the ability to scale,
    deploy, and monitor them independently.
"""

from datetime import datetime, timezone

from shared.http_client import ServiceClient
from shared.logging import get_logger
from shared.schemas import JobStatus, JobSubmission

logger = get_logger(__name__)


class JobProcessor:
    """Processes batch jobs by calling Model Service for each prompt."""

    def __init__(self, model_service_client: ServiceClient, queue):
        self.model_client = model_service_client
        self.queue = queue

    async def process(self, job_id: str, submission: JobSubmission) -> None:
        """Process all prompts in a job submission."""
        results = []
        completed_count = 0

        logger.info("job_processing_started", job_id=job_id, total=len(submission.prompts))

        try:
            for i, prompt in enumerate(submission.prompts):
                logger.info("processing_prompt", job_id=job_id, index=i, total=len(submission.prompts))

                response = await self.model_client.post(
                    "/inference",
                    json={
                        "prompt": prompt,
                        "model": submission.model,
                        "max_tokens": submission.max_tokens,
                    },
                )
                results.append(response["text"])
                completed_count += 1

                # Update progress
                await self.queue.update_job(
                    job_id,
                    completed_prompts=completed_count,
                    results=results.copy(),
                )

            # Mark as completed
            await self.queue.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                completed_at=datetime.now(timezone.utc),
                completed_prompts=completed_count,
                results=results,
            )
            logger.info("job_completed", job_id=job_id, results=len(results))

        except Exception as exc:
            logger.error("job_failed", job_id=job_id, error=str(exc))
            await self.queue.update_job(
                job_id,
                status=JobStatus.FAILED,
                completed_at=datetime.now(timezone.utc),
                error=str(exc),
            )
