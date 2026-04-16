"""
Background worker loop — polls the queue and processes jobs.

Runs as an asyncio task within the FastAPI process. In production, you'd run
this as a separate process or use a dedicated worker framework (Celery, ARQ),
but for teaching purposes, co-locating it with the API keeps things simple.

Why a background loop:
    Background tasks decouple submission from execution. The API returns
    immediately with a job_id, and the worker processes at its own pace.
    This is essential for batch inference where processing N prompts could
    take minutes.
"""

import asyncio

from shared.logging import get_logger
from worker_service.app.services.processor import JobProcessor
from worker_service.app.services.queue import BaseQueue

logger = get_logger(__name__)


async def worker_loop(queue: BaseQueue, processor: JobProcessor, poll_interval: float = 1.0):
    """Continuously poll the queue and process jobs.

    Args:
        queue: The job queue to poll
        processor: Handles job execution
        poll_interval: Seconds between polls when queue is empty
    """
    logger.info("worker_loop_started", poll_interval=poll_interval)

    while True:
        try:
            item = await queue.dequeue()

            if item is None:
                # No pending jobs — wait before polling again
                await asyncio.sleep(poll_interval)
                continue

            job_id, submission = item
            logger.info("worker_picked_up_job", job_id=job_id)

            # Process the job (this may take a while for large batches)
            await processor.process(job_id, submission)

        except asyncio.CancelledError:
            logger.info("worker_loop_cancelled")
            break
        except Exception as exc:
            # Log but don't crash the worker loop — it should keep running
            logger.error("worker_loop_error", error=str(exc))
            await asyncio.sleep(poll_interval)
