AI Platform Backend

This is a production AI assistant platform with a 3-service FastAPI backend (api_gateway,
model_service, worker_service) plus a React frontend. The backend services communicate over
HTTP. The project is Python 3.11+ with async/await throughout.

## Project

Three FastAPI services behind an Nginx reverse proxy:

- **api_gateway** (:8000): public-facing, handles CORS, routes chat/generate/jobs requests
- **model_service** (:8001): LLM inference via Groq (llama-3.3-70b-versatile)
- **worker_service** (:8002): background job processing queue

Shared code (ORM models, schemas, DB session, errors, logging) lives in `baseline/shared/`.

## Conventions

- Python: snake_case for everything, type hints required, Pydantic v2 for all I/O
- All async: use `async def` + `await`, never block the event loop
- Logging: use `structlog` - call `logger.info("event_name", key=value)`, not f-strings
- Imports: absolute within a service (`from api_gateway.app.config import ...`),
  shared module imported as `from shared.db import ...`
- Tests: `pytest` with `pytest-asyncio`; run from `baseline/` with `python -m pytest tests/ -v`

## Dependency Injection

FastAPI `Depends()` is the pattern for injecting services, DB sessions, and settings into
route handlers. Module-level singletons are initialized in the lifespan context manager in
each service's `main.py`, then exposed via getter functions in `dependencies.py`.

```python
# Route handlers receive injected dependencies, don't instantiate clients inside handlers
@router.post("/generate")
async def generate(body: GenerateRequest, client: ServiceClient = Depends(get_model_client)):
    ...
```

## Queue

The worker service uses an in-memory queue (`InMemoryQueue`) to process batch jobs. Jobs
submitted to `POST /api/v1/jobs` are stored in Postgres and picked up by the background
worker loop. The implementation lives in `worker_service/app/services/queue.py`.

## Mock Mode

Set `USE_MOCK=1` in your environment to bypass the Groq API and return a canned response.
Useful for offline development and tests.
