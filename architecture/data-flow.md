<!-- Version: v1 | Last updated: 2026-04-23 | Status: current -->

# Prodigon AI Platform -- Data Flow & Request Lifecycles

This document traces every user-facing flow through the Prodigon platform, from the first keystroke to the final rendered pixel. Each flow is illustrated with a Mermaid sequence diagram and annotated with the exact function calls, store mutations, and network hops involved.

Use this alongside the [API Reference](api-reference.md) for payload schemas, [Backend Architecture](backend-architecture.md) for service internals, and [Frontend Architecture](frontend-architecture.md) for component/store details.

---

## 1. Streaming Chat (Primary Flow)

This is the most complex and most important flow in the platform. It exercises the full stack: React state management, Server-Sent Events over fetch, Vite dev proxy (or Nginx in production), the API Gateway's streaming proxy, the Model Service's streaming inference, and the Groq API's chunked completion endpoint.

```mermaid
sequenceDiagram
    participant User
    participant MessageInput
    participant ChatView
    participant ChatStore
    participant useStream
    participant FetchAPI as Fetch API (Browser)
    participant ViteProxy as Vite Proxy / Nginx
    participant Gateway as API Gateway :8000
    participant ModelService as Model Service :8001
    participant GroqAPI as Groq API

    User->>MessageInput: Types prompt, presses Enter
    MessageInput->>ChatView: handleSend(prompt)

    Note over ChatView,ChatStore: Store the user message and create a streaming placeholder

    ChatView->>ChatStore: addMessage(sessionId, {role:'user', content:prompt})
    Note right of ChatStore: Auto-titles session from first message
    ChatView->>ChatStore: addMessage(sessionId, {role:'assistant', content:'', isStreaming:true})
    Note right of ChatStore: Creates placeholder message with unique msgId

    ChatView->>useStream: start(generateRequest, {onToken, onDone, onError})

    Note over useStream,FetchAPI: Initiate streaming fetch

    useStream->>FetchAPI: fetch POST /api/v1/generate/stream<br/>Body: {prompt, model, stream:true}<br/>Creates AbortController

    FetchAPI->>ViteProxy: POST /api/v1/generate/stream
    Note over ViteProxy: Dev: Vite proxy (vite.config.ts)<br/>Prod: Nginx reverse proxy

    ViteProxy->>Gateway: POST /api/v1/generate/stream

    Note over Gateway,ModelService: Gateway streams request to Model Service

    Gateway->>Gateway: Creates httpx.AsyncClient with stream context
    Gateway->>ModelService: POST /inference/stream<br/>httpx async streaming request

    ModelService->>ModelService: ModelManager.generate_stream(prompt, model, ...)
    ModelService->>ModelService: ModelManager.resolve_model() -- tries requested model
    ModelService->>GroqAPI: GroqInferenceClient.generate_stream()<br/>Groq SDK with stream=True

    GroqAPI-->>ModelService: Streaming chunks (SSE)

    loop For each chunk from Groq
        ModelService-->>ModelService: yield token from chunk
        ModelService-->>ModelService: Format as data: {"token":"..."}\n\n
        ModelService-->>Gateway: StreamingResponse chunk (SSE bytes)
        Gateway-->>ViteProxy: Proxied SSE bytes
        ViteProxy-->>FetchAPI: SSE chunk
        FetchAPI-->>useStream: ReadableStream reader.read()
        useStream-->>useStream: Parse data: line, extract token
        useStream->>ChatStore: onToken(token)
        ChatStore->>ChatStore: appendToMessage(sessionId, msgId, token)
        Note right of ChatStore: React re-renders MessageBubble
        Note right of ChatStore: Auto-scroll via IntersectionObserver
    end

    ModelService-->>Gateway: data: [DONE]\n\n
    Gateway-->>ViteProxy: data: [DONE]\n\n
    ViteProxy-->>FetchAPI: data: [DONE]\n\n
    FetchAPI-->>useStream: Stream complete

    useStream->>ChatStore: onDone({latencyMs})
    ChatStore->>ChatStore: updateMessage(sessionId, msgId,<br/>{isStreaming:false, latencyMs})
    Note right of ChatStore: Stop button disappears,<br/>typing indicator hides
```

**Cancellation path:** If the user clicks the Stop button during streaming, `useStream.stop()` calls `AbortController.abort()`. This terminates the `fetch` request immediately. The browser closes the connection, which propagates upstream: Vite/Nginx drops the proxy connection, the Gateway's `httpx` stream is interrupted, and the Model Service's generator is garbage-collected. The `onError` callback fires with an `AbortError`, and `ChatStore.updateMessage()` sets `isStreaming: false` on the partial message, preserving whatever tokens were already received.

---

## 2. Non-Streaming Chat

A simpler variant used when the user (or a future settings toggle) opts out of streaming. The entire response is returned in a single JSON payload.

```mermaid
sequenceDiagram
    participant User
    participant ChatView
    participant ChatStore
    participant API as api.generate()
    participant Gateway as API Gateway :8000
    participant ModelService as Model Service :8001
    participant GroqAPI as Groq API

    User->>ChatView: Sends prompt
    ChatView->>ChatStore: addMessage(sessionId, {role:'user', content:prompt})
    ChatView->>ChatStore: addMessage(sessionId, {role:'assistant', content:'', isStreaming:true})
    Note right of ChatStore: Placeholder shows typing indicator

    ChatView->>API: api.generate(POST /api/v1/generate)
    API->>Gateway: POST /api/v1/generate<br/>{prompt, model, stream:false}

    Gateway->>ModelService: ServiceClient.post("/inference")<br/>{prompt, model}
    ModelService->>ModelService: ModelManager.generate()
    ModelService->>GroqAPI: GroqInferenceClient.generate()<br/>Groq SDK (non-streaming)
    GroqAPI-->>ModelService: Complete response

    ModelService-->>Gateway: GenerateResponse {text, model, latency_ms}
    Gateway-->>API: JSON response
    API-->>ChatView: Parsed response

    ChatView->>ChatStore: updateMessage(sessionId, msgId,<br/>{content: response.text,<br/>isStreaming:false, model, latencyMs})
    Note right of ChatStore: Full message renders at once
```

The key difference from the streaming flow: no `ReadableStream` parsing, no incremental store updates, and no SSE protocol. The tradeoff is a longer perceived wait time (no tokens appear until the full response is ready) but simpler error handling.

---

## 2b. Chat Session Lifecycle (Server-Backed)

Chat state lives in Postgres. The frontend store is a cache of server state: it hydrates on app mount, persists every mutation through the chat API, and survives refresh / tab close / browser switch.

Streaming assistant turns need an id before the server has one, so the frontend uses a **client-side temp id** (`tmp-<nanoid>`) while tokens arrive, then swaps it for the server UUID once `persistAssistantMessage` returns. Failed streams are deliberately not persisted — partial markdown is worse UX than a missing turn.

```mermaid
sequenceDiagram
    participant User
    participant ChatView
    participant ChatStore as chat-store
    participant API as chatApi
    participant Gateway as API Gateway :8000
    participant Repo as ChatRepository
    participant DB as Postgres

    Note over ChatStore: App mount -- hydrate()
    ChatStore->>API: listSessions()
    API->>Gateway: GET /api/v1/chat/sessions
    Gateway->>Repo: list_sessions()
    Repo->>DB: SELECT ... ORDER BY updated_at DESC
    DB-->>Repo: rows + message counts
    Repo-->>Gateway: ChatSessionOut[]
    Gateway-->>API: JSON
    API-->>ChatStore: mapSessionSummary(...)

    Note over User,ChatView: User sends a prompt
    User->>ChatView: handleSend(prompt)

    ChatView->>ChatStore: persistUserMessage(sessionId, content)
    Note right of ChatStore: Optimistic local add with tmp id
    ChatStore->>API: appendMessage(sessionId, {role:'user', content})
    API->>Gateway: POST /api/v1/chat/sessions/{id}/messages
    Gateway->>Repo: append_message(session_id, payload)
    Repo->>DB: INSERT chat_messages + UPDATE chat_sessions.updated_at
    DB-->>Repo: ChatMessage row
    Repo-->>Gateway: ChatMessageOut
    Gateway-->>API: JSON (server UUID)
    API-->>ChatStore: swap tmp id for server UUID

    Note over ChatStore: Assistant placeholder + streaming loop
    ChatStore->>ChatStore: addAssistantPlaceholder(tmp-id)
    loop Per streamed token
        ChatStore->>ChatStore: appendToMessage(tmp-id, token)
    end

    Note over ChatStore: onDone -- persist assistant
    ChatStore->>API: appendMessage(sessionId, {role:'assistant', content, meta:{model,latency_ms}})
    API->>Gateway: POST /api/v1/chat/sessions/{id}/messages
    Gateway->>Repo: append_message(...)
    Repo->>DB: INSERT chat_messages + UPDATE updated_at
    DB-->>Repo: row
    Repo-->>Gateway: ChatMessageOut
    Gateway-->>API: JSON
    API-->>ChatStore: reconcile tmp id -> server UUID

    Note over ChatView,ChatStore: Sidebar session switch (lazy message load)
    User->>ChatView: clicks another session
    ChatView->>ChatStore: setActiveSession(id)
    alt messages not yet loaded
        ChatStore->>API: getSession(id)
        API->>Gateway: GET /api/v1/chat/sessions/{id}
        Gateway->>Repo: get_session_detail(id) -- selectinload(messages)
        Repo->>DB: SELECT session + messages
        DB-->>Repo: rows
        Repo-->>Gateway: ChatSessionDetail
        Gateway-->>ChatStore: messages populated
    end
```

**Refresh semantics**: the assistant turn runs entirely against the client-side temp id until `onDone`. If the user refreshes the tab mid-stream, the temp id vanishes with the tab — the completed-so-far content was never sent to the server, so the reloaded view shows only the user message. This is a deliberate simplification; see the ADR in `design-decisions.md`.

---

## 3. Batch Job Submission & Polling

Batch processing lets users submit multiple prompts at once for background inference. This flow has three distinct phases: submission, background processing, and polling.

### 3a. Job Submission

```mermaid
sequenceDiagram
    participant User
    participant JobSubmitForm
    participant API as api.submitJob()
    participant Gateway as API Gateway :8000
    participant WorkerService as Worker Service :8002
    participant Queue as PostgresQueue
    participant DB as Postgres batch_jobs

    User->>JobSubmitForm: Enters prompts (one per line)
    User->>JobSubmitForm: Clicks Submit

    JobSubmitForm->>API: api.submitJob(POST /api/v1/jobs)<br/>JobSubmission {prompts[], model}
    API->>Gateway: POST /api/v1/jobs

    Gateway->>WorkerService: ServiceClient.post("/jobs")<br/>JobSubmission payload
    WorkerService->>Queue: enqueue(submission)
    Queue->>DB: INSERT INTO batch_jobs<br/>(id, status='pending', prompts=JSONB, ...)
    DB-->>Queue: Committed row
    Queue-->>WorkerService: JobResponse (status:'pending')

    WorkerService-->>Gateway: 202 Accepted<br/>JobResponse {job_id, status:'pending',<br/>total_prompts, completed_prompts:0}
    Gateway-->>API: 202 Accepted
    API-->>JobSubmitForm: JobResponse

    JobSubmitForm->>JobSubmitForm: jobs-store.addJob(jobResponse)
    Note right of JobSubmitForm: Job appears in jobs list<br/>with "Pending" badge
```

### 3b. Background Processing (Postgres SKIP LOCKED)

```mermaid
sequenceDiagram
    participant WorkerLoop as worker_loop (background)
    participant Queue as PostgresQueue
    participant DB as Postgres batch_jobs
    participant Processor as Processor
    participant ModelService as Model Service :8001
    participant GroqAPI as Groq API

    loop poll_interval seconds
        WorkerLoop->>Queue: dequeue()
        Queue->>DB: SELECT * FROM batch_jobs<br/>WHERE status='pending'<br/>ORDER BY created_at ASC<br/>LIMIT 1<br/>FOR UPDATE SKIP LOCKED
        alt No pending row
            DB-->>Queue: empty
            Queue-->>WorkerLoop: None
            Note right of WorkerLoop: sleep(poll_interval)
        else Row claimed (locked for this tx)
            DB-->>Queue: BatchJob row (locked)
            Queue->>DB: UPDATE batch_jobs SET status='running'<br/>COMMIT
            Note right of DB: Lock releases; other workers<br/>see 'running' and skip this row
            Queue-->>WorkerLoop: (job_id, submission)
        end
    end

    WorkerLoop->>Processor: process(job_id, submission)

    loop For each prompt
        Processor->>ModelService: ServiceClient.post("/inference")
        ModelService->>GroqAPI: generate()
        GroqAPI-->>ModelService: response text
        ModelService-->>Processor: InferenceResponse

        Processor->>Queue: update_job(job_id,<br/>completed_prompts+=1,<br/>results=[...])
        Queue->>DB: UPDATE batch_jobs<br/>SET completed_prompts=..., results=...<br/>WHERE id=:id
        Note right of DB: In-place update per iteration<br/>so polling clients see progress
    end

    Processor->>Queue: update_job(job_id, status='completed', completed_at=now())
    Queue->>DB: UPDATE batch_jobs SET status='completed', completed_at=...

    Note over Processor,DB: On failure
    Processor--xQueue: update_job(job_id, status='failed', error=msg)
    Queue--xDB: UPDATE batch_jobs SET status='failed', error=...
```

**Concurrency guarantee:** two workers running the same `SELECT ... FOR UPDATE SKIP LOCKED` query never see the same row. Worker A locks the oldest pending row; Worker B's query skips past the locked row and returns the next pending one (or `None`). No retries, no blocking, no contention storms. As soon as Worker A commits its `status='running'` update, Worker B's subsequent `WHERE status='pending'` filter excludes that row anyway — belt and braces.

### 3c. Frontend Polling

```mermaid
sequenceDiagram
    participant JobsView
    participant useJobPoll as useJobPoll(jobId)
    participant API as api.getJob()
    participant Gateway as API Gateway :8000
    participant WorkerService as Worker Service :8002
    participant Queue as PostgresQueue
    participant DB as Postgres batch_jobs
    participant JobsStore as jobs-store

    JobsView->>useJobPoll: Start polling (interval: 2s)

    loop Every 2 seconds
        useJobPoll->>API: api.getJob(GET /api/v1/jobs/{id})
        API->>Gateway: GET /api/v1/jobs/{id}
        Gateway->>WorkerService: ServiceClient.get("/jobs/{id}")
        WorkerService->>Queue: get_job(job_id)
        Queue->>DB: SELECT * FROM batch_jobs WHERE id=:id
        DB-->>Queue: row
        Queue-->>WorkerService: JobResponse with current progress
        WorkerService-->>Gateway: JobResponse
        Gateway-->>API: JSON response
        API-->>useJobPoll: JobResponse

        useJobPoll->>JobsStore: jobs-store.updateJob(jobResponse)
        Note right of JobsStore: Re-renders progress bar,<br/>updates status badge

        alt status is 'completed' or 'failed'
            useJobPoll->>useJobPoll: clearInterval() -- stop polling
            Note right of useJobPoll: Terminal state reached
        end
    end
```

**Design note:** Polling was chosen over WebSockets for simplicity. At scale, this would be replaced with SSE push notifications or WebSocket channels to reduce unnecessary requests. The 2-second interval balances responsiveness against server load.

---

## 4. Health Monitoring

The health flow runs continuously in the background, independent of user interaction. It drives the connection banner and the dashboard health indicators.

```mermaid
sequenceDiagram
    participant App as App.tsx (mount)
    participant useHealthPoll as useHealthPoll()
    participant API as api.health()
    participant Gateway as API Gateway :8000
    participant HealthStore
    participant Dashboard as DashboardView
    participant Banner as ConnectionBanner

    App->>useHealthPoll: Hook initializes on mount

    Note over useHealthPoll,API: Immediate first check

    useHealthPoll->>API: api.health(GET /health)
    API->>Gateway: GET /health
    Gateway-->>API: {status:'healthy', version, environment, uptime_seconds}
    API-->>useHealthPoll: HealthResponse

    useHealthPoll->>HealthStore: setServiceHealth({status:'healthy',<br/>responseTimeMs, version, environment})
    useHealthPoll->>HealthStore: setConnected(true)

    HealthStore-->>Banner: connected=true -- Banner hides
    HealthStore-->>Dashboard: Renders HealthCard (green dot)<br/>+ MetricsCard (response time)

    Note over useHealthPoll: setInterval(15000) starts

    loop Every 15 seconds
        useHealthPoll->>API: api.health(GET /health)

        alt Success
            API-->>useHealthPoll: HealthResponse
            useHealthPoll->>HealthStore: setServiceHealth(updated)
            useHealthPoll->>HealthStore: setConnected(true)
            HealthStore-->>Banner: Banner stays hidden
            HealthStore-->>Dashboard: Updates metrics
        else Failure (network error / timeout)
            API--xuseHealthPoll: Error
            useHealthPoll->>HealthStore: setConnected(false)
            HealthStore-->>Banner: Banner shows:<br/>"Unable to connect to server"<br/>+ retrying spinner
            HealthStore-->>Dashboard: All services marked 'down'<br/>HealthCard shows red dot
        end
    end

    Note over useHealthPoll,Banner: When connection restores after failure,<br/>setConnected(true) hides banner automatically
```

**Resilience behavior:** The health poll never stops, even after repeated failures. It continues attempting every 15 seconds. When a previously-down backend comes back online, the next successful poll automatically restores the green status and hides the connection banner -- no page refresh required.

---

## 5. Request ID Propagation

Request IDs enable end-to-end tracing of a single user action across all services. Here is how `X-Request-ID` flows through the system:

```mermaid
graph LR
    subgraph Browser
        A[User Action]
    end

    subgraph "Nginx (prod)"
        B["Generates $request_id<br/>if not present in<br/>incoming request"]
    end

    subgraph "API Gateway"
        C["RequestLoggingMiddleware<br/>generates UUID if<br/>X-Request-ID not in headers"]
        D["Logs request_started<br/>with request_id bound<br/>via structlog"]
        E["Attaches X-Request-ID<br/>to response headers"]
    end

    subgraph "Model Service"
        F["Receives request<br/>(request_id not yet<br/>forwarded -- see note)"]
    end

    A --> B
    B -->|"X-Request-ID header"| C
    C --> D
    D --> E
    C -->|"HTTP call"| F
```

**How it works step by step:**

1. **Nginx layer (production only):** Nginx generates a `$request_id` using its built-in variable if the incoming request does not already carry an `X-Request-ID` header. This ID is passed upstream to the Gateway.

2. **RequestLoggingMiddleware (Gateway):** On every inbound request, the middleware checks for the `X-Request-ID` header. If absent (e.g., in development without Nginx), it generates a new UUID. The request ID is bound to the structlog context, so every log line emitted during that request includes it automatically.

3. **Response headers:** The middleware attaches the `X-Request-ID` to the outgoing response so the browser (or any upstream caller) can correlate the request.

4. **Inter-service propagation (future improvement):** Currently, `ServiceClient` does not forward the `X-Request-ID` when making calls from the Gateway to the Model Service or Worker Service. This means traces break at service boundaries. A future enhancement should pass the request ID through all inter-service calls to enable full distributed tracing.

---

## 6. Error Propagation Chain

Errors flow upward through a well-defined chain, with each layer adding context or attempting recovery before re-raising.

```mermaid
graph TD
    GroqAPI["Groq API"]
    GroqClient["GroqInferenceClient"]
    ModelManager["ModelManager"]
    FallbackAttempt["ModelManager<br/>(fallback model)"]
    InferenceRoute["Model Service Route"]
    FastAPIHandler["FastAPI app_error_handler"]
    JSONError["JSON Response<br/>{error: {code, message}}"]
    GatewayHTTPX["Gateway httpx call"]
    HTTPStatusError["httpx.HTTPStatusError"]
    GatewayReRaise["Gateway re-raises<br/>as HTTPException"]
    Nginx["Nginx"]
    BrowserFetch["Browser fetch()"]
    ApiRequestError["ApiRequestError<br/>(status, code, message)"]
    ChatStoreError["ChatStore.updateMessage<br/>(error: message)"]
    MessageBubble["MessageBubble<br/>error state + retry button"]

    GroqAPI -->|"API error<br/>(rate limit, invalid key, etc.)"| GroqClient
    GroqClient -->|"raises exception"| ModelManager
    ModelManager -->|"catches, tries fallback model"| FallbackAttempt
    FallbackAttempt -->|"fallback succeeds"| InferenceRoute
    FallbackAttempt -->|"both models fail"| InferenceRoute

    InferenceRoute -->|"InferenceError"| FastAPIHandler
    FastAPIHandler --> JSONError
    JSONError -->|"HTTP 502"| GatewayHTTPX

    GatewayHTTPX --> HTTPStatusError
    HTTPStatusError --> GatewayReRaise
    GatewayReRaise --> Nginx
    Nginx --> BrowserFetch

    BrowserFetch --> ApiRequestError
    ApiRequestError --> ChatStoreError
    ChatStoreError --> MessageBubble

    style MessageBubble fill:#fee,stroke:#c00
    style FallbackAttempt fill:#ffe,stroke:#aa0
```

### Service Unavailable Path

When the Model Service itself is unreachable (container down, network partition), the error path is different:

```mermaid
graph TD
    GatewayCall["Gateway ServiceClient.post('/inference')"]
    ConnectError["httpx.ConnectError<br/>(connection refused)"]
    ServiceClientCatch["ServiceClient catches<br/>ConnectError"]
    ServiceUnavailable["ServiceUnavailableError<br/>HTTP 503"]
    GatewayHandler["Gateway error handler"]
    JSONResponse["JSON Response<br/>{error: {code:'SERVICE_UNAVAILABLE',<br/>message:'Model Service is unreachable'}}"]
    Browser["Browser"]
    ErrorState["ChatStore error state<br/>+ retry button"]

    GatewayCall --> ConnectError
    ConnectError --> ServiceClientCatch
    ServiceClientCatch --> ServiceUnavailable
    ServiceUnavailable --> GatewayHandler
    GatewayHandler --> JSONResponse
    JSONResponse --> Browser
    Browser --> ErrorState

    style ServiceUnavailable fill:#fee,stroke:#c00
    style ErrorState fill:#fee,stroke:#c00
```

**Key error behaviors:**

- **Automatic fallback:** When the primary model fails (e.g., rate limit on `llama-3.3-70b-versatile`), `ModelManager` automatically retries with the fallback model (e.g., `llama-3.1-8b-instant`) before giving up.
- **Structured error responses:** All errors reaching the client follow the same shape: `{error: {code: string, message: string}}`, making frontend error handling consistent.
- **Retry affordance:** When the frontend displays an error in a `MessageBubble`, it includes a retry button. Clicking it re-sends the original prompt through the same flow.
- **Streaming errors:** During a streaming response, if an error occurs mid-stream, the SSE connection drops. The `useStream` hook detects the broken stream, calls `onError`, and the partial response is preserved with an error indicator appended.

---

## 7. Workshop Content Fetch

When the user navigates into a workshop topic, the SPA pulls the markdown on demand from the gateway rather than bundling every topic into the initial payload. Read history lives in localStorage (`prodigon-read-history`, keyed by subtopic id) so returning users see their progress immediately without a server round trip.

```mermaid
sequenceDiagram
    participant User
    participant TopicTree as TopicTree / TopicsPanel
    participant Router as React Router
    participant ContentPage as ContentPage
    participant API as fetchWorkshopContent
    participant Gateway as API Gateway :8000
    participant Workshop as workshop.py route
    participant FS as workshop/ files on disk
    participant Viewer as ContentViewer
    participant TopicsStore as topics-store

    User->>TopicTree: Clicks a subtopic link
    TopicTree->>Router: navigate('/topics/:taskId/:subtopicId')
    Router->>ContentPage: mount
    ContentPage->>API: fetchWorkshopContent(subtopic.filePath)
    API->>Gateway: GET /api/v1/workshop/content?path=<relative>.md

    Gateway->>Workshop: get_workshop_content(path)
    Workshop->>Workshop: _validate_path(raw)<br/>reject '..', absolute, non-.md
    Workshop->>Workshop: (_WORKSHOP_ROOT / raw).resolve()<br/>.relative_to(_WORKSHOP_ROOT)
    Workshop->>FS: Path.read_text()
    FS-->>Workshop: file bytes
    Workshop-->>Gateway: {content, path}
    Gateway-->>API: JSON
    API-->>ContentPage: content string

    ContentPage->>Viewer: render via MarkdownRenderer
    Note right of Viewer: GFM tables, code blocks,<br/>mermaid diagrams

    Note over Viewer: Scroll behaviour
    User->>Viewer: scrolls to end
    Viewer->>Viewer: IntersectionObserver fires on bottom sentinel
    Viewer->>TopicsStore: markAsRead(subtopicId)
    TopicsStore->>TopicsStore: readHistory[].push(...)
    Note right of TopicsStore: Persisted to localStorage<br/>key: prodigon-read-history
```

**Security path**: traversal attempts (`path=../../.env`) return `400 INVALID_PATH` before any filesystem read. The resolved-path check (`Path.relative_to(_WORKSHOP_ROOT)`) catches symlink escapes too. See [Backend Architecture §8](backend-architecture.md#8-workshop-content-route).

---

## 8. Lifespan — Engine Disposal

Both services end their `lifespan()` with `await dispose_engine()` from `shared.db`. The call walks the shared `AsyncEngine`'s pool and closes every connection cleanly, then nulls the module-level `_engine` / `_sessionmaker` globals. This matters for:

- **`docker stop`**: connections hit `FIN` instead of RST, so Postgres's `pg_stat_activity` clears immediately instead of waiting for TCP timeout.
- **Test runs**: `pytest` can re-import modules and rebuild engines between test files without leaking connections.
- **Local dev reloads**: uvicorn's `--reload` tears down the app cleanly between code changes.

The gateway's shutdown order is: HTTP client `close()` → worker client `close()` → `dispose_engine()`. The worker's order is: cancel `worker_task` → model client `close()` → `dispose_engine()`. In both cases the DB pool is the last async resource released, since any in-flight handler might still need it.

---

## Cross-References

| Document | What it covers |
|----------|---------------|
| [API Reference](api-reference.md) | Request/response schemas, endpoint details, status codes |
| [Backend Architecture](backend-architecture.md) | Service internals, module structure, configuration |
| [Frontend Architecture](frontend-architecture.md) | Component tree, store design, hooks, routing |
| [System Overview](system-overview.md) | High-level architecture, tech stack, deployment |
