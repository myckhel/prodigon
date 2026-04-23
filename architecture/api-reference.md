<!-- Version: v1 | Last updated: 2026-04-23 | Status: current -->

# Prodigon AI Platform -- API Reference

Complete endpoint reference for the Prodigon AI system. This document covers every public and internal endpoint, request/response schemas, error codes, and usage examples. Frontend developers can use this as a standalone guide without reading backend source code.

---

## Table of Contents

1. [Base URLs](#1-base-urls)
2. [Health Check](#2-health-check)
3. [Text Generation](#3-text-generation)
   - [3.5 Chat API](#35-chat-api)
   - [3.6 Workshop Content API](#36-workshop-content-api)
4. [Streaming Text Generation (SSE)](#4-streaming-text-generation-sse)
5. [Batch Job Submission](#5-batch-job-submission)
6. [Job Status](#6-job-status)
7. [Internal Endpoints](#7-internal-endpoints-not-exposed-via-gateway)
8. [Error Response Format](#8-error-response-format)
9. [Request Headers](#9-request-headers)
10. [Cross-references](#cross-references)

---

## 1. Base URLs

| Environment | URL | Notes |
|---|---|---|
| Local dev (direct) | `http://localhost:8000` | API Gateway directly |
| Local dev (via Vite) | `http://localhost:5173` | Vite proxies `/api/*` and `/health` |
| Docker Compose | `http://localhost:80` | Nginx reverse proxy |

**Authentication:** None (to be added in Workshop Task 9).

**Auto-generated docs:**

| Path | Description |
|---|---|
| `GET /docs` | Swagger UI -- interactive API explorer |
| `GET /openapi.json` | OpenAPI 3.x schema (machine-readable) |

---

## 2. Health Check

### `GET /health`

Returns service health status. Use this to verify a service is running and reachable.

**Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "api-gateway",
  "version": "0.1.0",
  "environment": "development"
}
```

**Available on all services:**

| Service | URL | Visibility |
|---|---|---|
| API Gateway | `http://localhost:8000/health` | Public |
| Model Service | `http://localhost:8001/health` | Internal |
| Worker Service | `http://localhost:8002/health` | Internal |

---

## 3. Text Generation

### `POST /api/v1/generate`

Synchronous text generation. The API Gateway proxies this request to the Model Service, waits for the full response, and returns it to the client.

**Request body:**

```json
{
  "prompt": "Explain dependency injection in 3 sentences",
  "model": "llama-3.3-70b-versatile",
  "max_tokens": 1024,
  "temperature": 0.7,
  "system_prompt": "You are a helpful assistant"
}
```

**Request parameters:**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `prompt` | string | yes | -- | 1--10000 characters |
| `model` | string | no | `llama-3.3-70b-versatile` | -- |
| `max_tokens` | integer | no | `1024` | 1--8192 |
| `temperature` | float | no | `0.7` | 0.0--2.0 |
| `system_prompt` | string | no | `null` | -- |

**Response (200 OK):**

```json
{
  "text": "Dependency injection is a design pattern...",
  "model": "llama-3.3-70b-versatile",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 87,
    "total_tokens": 102
  },
  "latency_ms": 1234.5
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `text` | string | Generated text output |
| `model` | string | Model used for generation |
| `usage.prompt_tokens` | integer | Number of tokens in the prompt |
| `usage.completion_tokens` | integer | Number of tokens generated |
| `usage.total_tokens` | integer | Sum of prompt + completion tokens |
| `latency_ms` | float | Server-side inference latency in milliseconds |

**Example:**

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, who are you?", "max_tokens": 256}'
```

---

## 3.5 Chat API

Persistent chat sessions and messages, backed by Postgres. All endpoints live under the API Gateway at `/api/v1/chat` (`baseline/api_gateway/app/routes/chat.py`) and are scoped internally by `user_id` (seeded default user until Part III authentication).

Pydantic schemas are defined once in `baseline/shared/schemas.py` — `ChatSessionCreate`, `ChatSessionUpdate`, `ChatSessionOut`, `ChatSessionDetail`, `ChatMessageCreate`, `ChatMessageOut`, `ChatMessageRole` (`"user"` / `"assistant"` / `"system"`). Timestamps are ISO 8601 UTC. The `meta` field on a message is an opaque JSONB bag used by the frontend for `model` and `latency_ms`.

**Common errors:**

| Condition | HTTP | Error code |
|---|---|---|
| Malformed session UUID in path (`_parse_uuid` failure) | 400 | `VALIDATION_ERROR` (detail: "Invalid session id") |
| Session does not exist / not owned by caller | 404 | `JOB_NOT_FOUND`-style envelope (detail: "Session not found") |

### `POST /api/v1/chat/sessions`

Create a new session.

**Request body** (`ChatSessionCreate`):

```json
{
  "title": "My design review session",
  "system_prompt": "You are a senior systems architect."
}
```

Both fields are optional. If `title` is omitted or null, the server uses `"New Chat"`. `title` max length 200.

**Response (201 Created)** — `ChatSessionOut`:

```json
{
  "id": "b8e5f0c4-...",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "title": "My design review session",
  "system_prompt": "You are a senior systems architect.",
  "created_at": "2026-04-23T14:30:00Z",
  "updated_at": "2026-04-23T14:30:00Z",
  "message_count": 0
}
```

### `GET /api/v1/chat/sessions`

List sessions for the current user. Returns summaries only — no messages — so the response stays small for users with many sessions. Ordered by `updated_at DESC`. Capped at 100 rows.

**Response (200 OK):** `ChatSessionOut[]` (same shape as above, `message_count` populated from a `COUNT(*)` subquery).

### `GET /api/v1/chat/sessions/{id}`

Fetch a single session plus its messages, ordered chronologically.

**Response (200 OK)** — `ChatSessionDetail`:

```json
{
  "id": "b8e5f0c4-...",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "title": "My design review session",
  "system_prompt": "You are a senior systems architect.",
  "created_at": "2026-04-23T14:30:00Z",
  "updated_at": "2026-04-23T14:35:12Z",
  "message_count": 2,
  "messages": [
    {
      "id": "3a1f...",
      "session_id": "b8e5f0c4-...",
      "role": "user",
      "content": "Design a rate limiter.",
      "meta": null,
      "created_at": "2026-04-23T14:30:04Z"
    },
    {
      "id": "4b2a...",
      "session_id": "b8e5f0c4-...",
      "role": "assistant",
      "content": "A token-bucket algorithm...",
      "meta": {"model": "llama-3.3-70b-versatile", "latency_ms": 812.4},
      "created_at": "2026-04-23T14:35:12Z"
    }
  ]
}
```

**Errors:** `400` on malformed UUID; `404` when the session isn't found or isn't owned by the caller.

### `PATCH /api/v1/chat/sessions/{id}`

Update `title` and/or `system_prompt`. Fields left out of the body are unchanged.

**Request body** (`ChatSessionUpdate`):

```json
{
  "title": "Renamed session"
}
```

**Response (200 OK):** `ChatSessionOut`.

### `DELETE /api/v1/chat/sessions/{id}`

Delete a session. `ON DELETE CASCADE` on the `chat_messages.session_id` foreign key drops every message in the same transaction.

**Response:** `204 No Content`. No body.

### `POST /api/v1/chat/sessions/{id}/messages`

Append a message to a session. Used for both user and assistant turns — the frontend POSTs the user message eagerly and the assistant message on `onDone` of the streaming response.

**Request body** (`ChatMessageCreate`):

```json
{
  "role": "assistant",
  "content": "Here's the outline...",
  "meta": {"model": "llama-3.3-70b-versatile", "latency_ms": 812.4}
}
```

`role` must be one of `user`, `assistant`, `system`; `content` must be non-empty; `meta` is optional.

**Response (201 Created)** — `ChatMessageOut`. Same shape as entries in `ChatSessionDetail.messages`. The session's `updated_at` is bumped in the same transaction so the sidebar re-sorts.

---

## 3.6 Workshop Content API

Read-only markdown reader for the frontend's topic pages. Source of truth: the repo's `workshop/` directory. Not intended for arbitrary static file hosting — the endpoint is deliberately scoped to `.md` files under one resolved root.

### `GET /api/v1/workshop/content`

**Query parameter:**

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | yes | Relative path under `workshop/`, e.g. `part1_design_patterns/task01_rest_vs_grpc/README.md`. |

**Response (200 OK):**

```json
{
  "content": "# REST vs gRPC\n\nThis task explores...",
  "path": "part1_design_patterns/task01_rest_vs_grpc/README.md"
}
```

`content` is the raw file text, UTF-8. `path` is echoed back verbatim from the request (useful for the client to confirm what was resolved).

**Errors:**

| Condition | HTTP | Error code |
|---|---|---|
| Path contains `..`, is absolute, or isn't `.md` | 400 | `INVALID_PATH` |
| Path resolves outside `_WORKSHOP_ROOT` (caught via `Path.relative_to`) | 400 | `INVALID_PATH` |
| File doesn't exist | 404 | `NOT_FOUND` |

Error envelope follows the standard shape (see §8).

**Notes:**

- No authentication. This is intentionally a plain `GET` so the frontend's `ContentViewer` can fetch without credential bookkeeping.
- Path traversal attempts are logged with the structlog event `workshop_path_traversal_attempt` for ops visibility.
- The resolution anchor is `Path(__file__).resolve().parents[4] / "workshop"` (see `baseline/api_gateway/app/routes/workshop.py`), so the gateway must run from within the baseline/ tree for this to resolve correctly. Docker builds mount the `workshop/` directory into the gateway's build context.

**Example:**

```bash
curl "http://localhost:8000/api/v1/workshop/content?path=part1_design_patterns/task01_rest_vs_grpc/README.md"
curl "http://localhost:8000/api/v1/workshop/content?path=../../.env"   # → 400 INVALID_PATH
```

---

## 4. Streaming Text Generation (SSE)

### `POST /api/v1/generate/stream`

Server-Sent Events streaming endpoint. Returns tokens incrementally as they are generated by the model. The connection stays open until generation is complete.

**Request body:** Same schema as [`POST /api/v1/generate`](#3-text-generation).

**Response headers:**

| Header | Value |
|---|---|
| `Content-Type` | `text/event-stream` |
| `Cache-Control` | `no-cache` |
| `X-Accel-Buffering` | `no` |

**SSE event format:**

Each event is a single `data:` line followed by two newlines (`\n\n`).

```
data: Hello

data:  world

data: !

data: [DONE]
```

**Event types:**

| Event | Format | Description |
|---|---|---|
| Token | `data: <token text>\n\n` | A generated token (may include leading spaces) |
| End signal | `data: [DONE]\n\n` | Generation is complete; close the connection |
| Error signal | `data: [ERROR] <message>\n\n` | An error occurred during generation |

**Error example:**

```
data: [ERROR] Model inference failed: rate limit exceeded
```

**Example:**

```bash
curl -N -X POST http://localhost:8000/api/v1/generate/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a haiku about coding"}'
```

> **Frontend note:** Use the `EventSource` API or `fetch` with a `ReadableStream` to consume SSE. The `-N` flag in curl disables output buffering, which is required to see tokens as they arrive.

---

## 5. Batch Job Submission

### `POST /api/v1/jobs`

Submit multiple prompts for background processing. The endpoint returns immediately with a job ID. Use the [Job Status](#6-job-status) endpoint to poll for progress and results.

**Request body:**

```json
{
  "prompts": [
    "Summarize the history of Python",
    "Explain what FastAPI is",
    "What is Docker?"
  ],
  "model": "llama-3.3-70b-versatile",
  "max_tokens": 512
}
```

**Request parameters:**

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `prompts` | string[] | yes | -- | 1--100 items |
| `model` | string | no | `llama-3.3-70b-versatile` | -- |
| `max_tokens` | integer | no | `1024` | 1--8192 |

**Response (202 Accepted):**

```json
{
  "job_id": "a1b2c3d4-e5f6-...",
  "status": "pending",
  "created_at": "2026-04-16T14:30:00Z",
  "completed_at": null,
  "total_prompts": 3,
  "completed_prompts": 0,
  "results": [],
  "error": null
}
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `job_id` | string (UUID) | Unique identifier for polling |
| `status` | string | One of: `pending`, `running`, `completed`, `failed` |
| `created_at` | string (ISO 8601) | Timestamp when the job was created |
| `completed_at` | string or null | Timestamp when the job finished (null while running) |
| `total_prompts` | integer | Number of prompts submitted |
| `completed_prompts` | integer | Number of prompts processed so far |
| `results` | string[] | Completed generation results (grows as prompts finish) |
| `error` | string or null | Error message if the job failed |

**Example:**

```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"prompts": ["What is Python?", "What is FastAPI?"]}'
```

> **Persistence note:** Jobs persist in the Postgres `batch_jobs` table — they survive worker restarts and support horizontal scaling. The worker's background loop dequeues pending rows via `SELECT ... FOR UPDATE SKIP LOCKED`, so multiple worker processes can compete on the same table without double-processing. The in-memory queue is still available via `QUEUE_TYPE=memory` for tests and no-DB demos. See [Backend Architecture §4](backend-architecture.md#4-worker-service-port-8002) for the queue strategy.

---

## 6. Job Status

### `GET /api/v1/jobs/{job_id}`

Poll job progress and retrieve results. Call this endpoint repeatedly until `status` is `completed` or `failed`.

**Path parameters:**

| Parameter | Type | Description |
|---|---|---|
| `job_id` | string (UUID) | The job ID returned from `POST /api/v1/jobs` |

**Response (200 OK) -- In progress:**

```json
{
  "job_id": "a1b2c3d4-e5f6-...",
  "status": "running",
  "created_at": "2026-04-16T14:30:00Z",
  "completed_at": null,
  "total_prompts": 3,
  "completed_prompts": 1,
  "results": ["Python is a high-level programming language..."],
  "error": null
}
```

**Response (200 OK) -- Completed:**

```json
{
  "job_id": "a1b2c3d4-e5f6-...",
  "status": "completed",
  "created_at": "2026-04-16T14:30:00Z",
  "completed_at": "2026-04-16T14:30:15Z",
  "total_prompts": 3,
  "completed_prompts": 3,
  "results": ["...", "...", "..."],
  "error": null
}
```

**Response (404 Not Found):**

```json
{
  "error": {
    "code": "JOB_NOT_FOUND",
    "message": "Job a1b2c3d4 not found"
  }
}
```

**Job status lifecycle:**

```
pending --> running --> completed
                   \-> failed
```

| Status | Meaning |
|---|---|
| `pending` | Job received, waiting to start processing |
| `running` | At least one prompt is being processed |
| `completed` | All prompts processed successfully |
| `failed` | Processing stopped due to an error |

**Example:**

```bash
curl http://localhost:8000/api/v1/jobs/a1b2c3d4-e5f6-...
```

> **Frontend note:** Poll every 2--5 seconds. Stop polling when `status` is `completed` or `failed`.

---

## 7. Internal Endpoints (Not Exposed via Gateway)

These endpoints are used for service-to-service communication. They are not accessible to external clients when running behind Nginx.

| Endpoint | Service | Port | Called By | Purpose |
|---|---|---|---|---|
| `POST /inference` | Model Service | 8001 | API Gateway, Worker Service | Synchronous inference |
| `POST /inference/stream` | Model Service | 8001 | API Gateway | Streaming inference |
| `POST /jobs` | Worker Service | 8002 | API Gateway | Enqueue a batch job |
| `GET /jobs/{job_id}` | Worker Service | 8002 | API Gateway | Check job status |

> **Note:** In Docker Compose, services resolve each other by container name (e.g., `http://model-service:8001/inference`). In local development, use `http://localhost:<port>`.

---

## 8. Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

**Error codes:**

| Error Code | HTTP Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Invalid request body (Pydantic validation failure) |
| `INFERENCE_ERROR` | 502 | Groq API failure after fallback models exhausted |
| `SERVICE_UNAVAILABLE` | 503 | Backend service unreachable or request timed out |
| `JOB_NOT_FOUND` | 404 | Invalid or unknown job ID |
| `INVALID_PATH` | 400 | Workshop content path contains `..`, is absolute, is non-`.md`, or resolves outside `_WORKSHOP_ROOT` |
| `NOT_FOUND` | 404 | Workshop content file does not exist |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

> **Frontend note:** Always check for the `error` key in responses with non-2xx status codes. The `code` field is stable and safe to use in conditional logic; the `message` field is for display only and may change.

---

## 9. Request Headers

| Header | Direction | Description |
|---|---|---|
| `Content-Type: application/json` | Request | Required for all `POST` endpoints |
| `X-Request-ID` | Request / Response | Correlation ID for distributed tracing. If not provided by the client, `RequestLoggingMiddleware` generates one automatically. The same ID is returned in the response and propagated to downstream services. |
| `X-Process-Time` | Response | Total request processing duration in seconds (e.g., `0.523`) |

---

## Cross-references

- [Data Flow](data-flow.md) -- End-to-end request routing through the system
- [Backend Architecture](backend-architecture.md) -- Service internals and module structure
- [System Overview](system-overview.md) -- High-level architecture diagram
