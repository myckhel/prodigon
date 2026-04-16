"""
Custom exception hierarchy for the platform.

All application errors extend AppError, which carries an HTTP status code and
a machine-readable error code. This allows FastAPI exception handlers to
return consistent JSON error responses regardless of which service raised the error.

Why a custom hierarchy:
    Generic Python exceptions (ValueError, RuntimeError) don't carry HTTP semantics.
    Wrapping them in AppError lets middleware translate any error into a clean
    API response: {"error": {"code": "INFERENCE_ERROR", "message": "...", "request_id": "..."}}.
"""


class AppError(Exception):
    """Base application error. All custom errors inherit from this."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(AppError):
    """Raised when request data fails validation."""

    def __init__(self, message: str = "Invalid request data"):
        super().__init__(message=message, status_code=422, error_code="VALIDATION_ERROR")


class InferenceError(AppError):
    """Raised when model inference fails (Groq API error, timeout, etc.)."""

    def __init__(self, message: str = "Inference failed"):
        super().__init__(message=message, status_code=502, error_code="INFERENCE_ERROR")


class ServiceUnavailableError(AppError):
    """Raised when a downstream service is unreachable."""

    def __init__(self, message: str = "Service unavailable", service: str = "unknown"):
        self.service = service
        super().__init__(
            message=f"{message}: {service}",
            status_code=503,
            error_code="SERVICE_UNAVAILABLE",
        )


class JobNotFoundError(AppError):
    """Raised when a requested job ID does not exist."""

    def __init__(self, job_id: str):
        self.job_id = job_id
        super().__init__(
            message=f"Job not found: {job_id}",
            status_code=404,
            error_code="JOB_NOT_FOUND",
        )
