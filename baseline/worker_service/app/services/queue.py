"""
Queue abstraction for job management.

Provides a BaseQueue interface with an InMemoryQueue implementation for local
development. The interface mirrors Redis semantics so swapping to a real Redis
backend (Task 8) requires no changes to business logic.

Why an abstraction:
    Coupling your worker directly to Redis means you can't run the system without
    Redis. An abstraction lets you develop and test with an in-memory queue, then
    swap to Redis for production — same interface, different backend.
    This is the Strategy pattern in action.
"""

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone

from shared.logging import get_logger
from shared.schemas import JobResponse, JobStatus, JobSubmission

logger = get_logger(__name__)


class BaseQueue(ABC):
    """Abstract queue interface. All queue backends implement this."""

    @abstractmethod
    async def enqueue(self, submission: JobSubmission) -> JobResponse:
        """Add a job to the queue. Returns the initial job response."""
        ...

    @abstractmethod
    async def dequeue(self) -> tuple[str, JobSubmission] | None:
        """Get the next pending job. Returns (job_id, submission) or None."""
        ...

    @abstractmethod
    async def get_job(self, job_id: str) -> JobResponse | None:
        """Get job status and results by ID."""
        ...

    @abstractmethod
    async def update_job(self, job_id: str, **kwargs) -> None:
        """Update job fields (status, results, error, etc.)."""
        ...


class InMemoryQueue(BaseQueue):
    """Dict-backed queue for local development. Not suitable for production.

    Jobs are stored in a dictionary keyed by job_id. A simple list serves as
    the pending queue. This implementation is single-process only — in production,
    use Redis or another shared queue backend.
    """

    def __init__(self):
        self._jobs: dict[str, JobResponse] = {}
        self._submissions: dict[str, JobSubmission] = {}
        self._pending: list[str] = []

    async def enqueue(self, submission: JobSubmission) -> JobResponse:
        job_id = str(uuid.uuid4())
        job = JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            total_prompts=len(submission.prompts),
        )
        self._jobs[job_id] = job
        self._submissions[job_id] = submission
        self._pending.append(job_id)

        logger.info("job_enqueued", job_id=job_id, prompts=len(submission.prompts))
        return job

    async def dequeue(self) -> tuple[str, JobSubmission] | None:
        if not self._pending:
            return None

        job_id = self._pending.pop(0)
        submission = self._submissions[job_id]

        # Mark as running
        self._jobs[job_id].status = JobStatus.RUNNING

        logger.info("job_dequeued", job_id=job_id)
        return job_id, submission

    async def get_job(self, job_id: str) -> JobResponse | None:
        return self._jobs.get(job_id)

    async def update_job(self, job_id: str, **kwargs) -> None:
        job = self._jobs.get(job_id)
        if job is None:
            return

        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)

        logger.info("job_updated", job_id=job_id, updates=list(kwargs.keys()))


def create_queue(queue_type: str = "memory") -> BaseQueue:
    """Factory function to create the appropriate queue backend."""
    if queue_type == "memory":
        return InMemoryQueue()
    elif queue_type == "redis":
        raise NotImplementedError(
            "Redis queue is implemented in Task 8 (Load Balancing & Caching). "
            "Use queue_type='memory' for now."
        )
    else:
        raise ValueError(f"Unknown queue type: {queue_type}")
