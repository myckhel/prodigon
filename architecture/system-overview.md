<!-- Version: v1 | Last updated: 2026-04-23 | Status: current -->

# Prodigon AI Platform -- System Overview

## 1. System Purpose

Prodigon is a multi-service AI assistant platform built as both a **production-grade system** and a **teaching vehicle** for the "Designing Production AI Systems" workshop series.

The platform demonstrates real-world architectural patterns -- service decomposition, config-driven behavior, structured logging, streaming inference, and containerized deployment -- while remaining simple enough to understand in under 30 minutes. Each workshop task evolves the baseline system, introducing new design patterns, scalability techniques, and security hardening.

---

## 2. Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, pydantic-settings, httpx, structlog, Groq SDK |
| **Persistence** | Postgres 16-alpine, SQLAlchemy 2.x async + asyncpg, Alembic (async-aware `env.py`) |
| **Frontend** | React 18.3, Vite 5.4, TypeScript 5.5, Zustand 4.5, Tailwind CSS 3.4, React Router 6, Lucide icons, Inter (Google Fonts CDN) |
| **Infrastructure** | Docker (multi-stage builds), docker-compose, Nginx 1.27, Redis 7 (stubbed for Task 8 -- unused in baseline) |
| **Tooling** | Ruff (lint), pytest + pytest-asyncio, npm + ESLint |

---

## 3. Architecture Diagram

```mermaid
graph TB
    subgraph Client
        Browser["Browser"]
    end

    subgraph "Production (Docker)""
        Nginx["Nginx :80"]
        FrontendProd["Frontend (prod) :3000"]
    end

    subgraph "Development"
        Vite["Vite Dev Server :5173"]
    end

    subgraph "Backend Services"
        APIGateway["API Gateway :8000"]
        ModelService["Model Service :8001"]
        WorkerService["Worker Service :8002"]
        Shared["shared/ module"]
    end

    subgraph "Data"
        Postgres[("Postgres :5432")]
        Workshop["workshop/ markdown files"]
    end

    subgraph "External"
        Groq["Groq Cloud API"]
        Redis["Redis :6379 (stub)"]
    end

    %% Production flow
    Browser -->|"HTTP"| Nginx
    Nginx -->|"/api/*"| APIGateway
    Nginx -->|"/*"| FrontendProd

    %% Dev flow
    Browser -.->|"HTTP (dev)"| Vite
    Vite -.->|"proxy /api/*"| APIGateway

    %% Backend routing
    APIGateway -->|"HTTP"| ModelService
    APIGateway -->|"HTTP"| WorkerService
    WorkerService -->|"inference calls"| ModelService
    ModelService -->|"LLM requests"| Groq

    %% Persistence (chat repo + durable queue)
    APIGateway -->|"chat sessions/messages"| Postgres
    WorkerService -->|"SKIP LOCKED queue"| Postgres

    %% Workshop content served off disk
    APIGateway -->|"workshop content"| Workshop

    %% Shared module
    APIGateway -.-|"imports"| Shared
    ModelService -.-|"imports"| Shared
    WorkerService -.-|"imports"| Shared

    %% Future
    WorkerService -.->|"future: Task 8"| Redis
```

**Legend:** Solid lines = active connections. Dashed lines = dev-mode or future paths.

---

## 4. Service Inventory

| Service | Port | Responsibility | Docker Image |
|---------|------|---------------|--------------|
| **Nginx** (reverse proxy) | 80 | Routes traffic, SSE support, static serving | `nginx:1.27-alpine` |
| **API Gateway** | 8000 | Public API, CORS, request logging, timing middleware. Hosts `/api/v1/chat/*` (session CRUD + message append) and `/api/v1/workshop/content` (markdown reader). | `python:3.11-slim` |
| **Model Service** | 8001 | LLM inference via Groq API, model fallback, streaming | `python:3.11-slim` |
| **Worker Service** | 8002 | Background batch job processing. Dequeues from the Postgres `batch_jobs` table via `SELECT ... FOR UPDATE SKIP LOCKED`. | `python:3.11-slim` |
| **Postgres** | 5432 | Chat + job persistence + durable queue. Single source of truth for `users`, `chat_sessions`, `chat_messages`, `batch_jobs`. | `postgres:16-alpine` |
| **Frontend** (dev) | 5173 | React SPA with Vite HMR, dev proxy | N/A (Vite dev server) |
| **Frontend** (prod) | 3000 | Static SPA served by nginx | `node:20-alpine` -> `nginx:1.27-alpine` |
| **Redis** | 6379 | Queue backend (stub, used in Task 8) | `redis:7-alpine` |

---

## 5. Repository Structure

```
prod-ai-system-design/
├── architecture/              # This documentation (you are here)
├── baseline/                  # Production services
│   ├── alembic/               # Migration scripts (async-aware env.py, versions/)
│   ├── alembic.ini            # Alembic config (sqlalchemy.url fallback, file_template)
│   ├── api_gateway/           # Public API entry point (:8000)
│   │   └── app/
│   │       ├── routes/        # generate.py, jobs.py, chat.py, workshop.py, health.py
│   │       └── services/      # chat_repository.py (ChatRepository CRUD)
│   ├── model_service/         # LLM inference engine (:8001)
│   ├── worker_service/        # Async job processor (:8002)
│   ├── shared/                # Cross-cutting: config, logging, schemas, errors, HTTP client
│   │   ├── db.py              # Async engine + sessionmaker + get_session dep
│   │   ├── models.py          # ORM: User, ChatSession, ChatMessage, BatchJob
│   │   ├── schemas.py
│   │   └── ...
│   ├── infra/                 # Nginx config, Dockerfile.nginx
│   ├── protos/                # gRPC definitions (Task 1 extension)
│   ├── tests/                 # Integration tests
│   └── docker-compose.yml
├── frontend/                  # React + Vite SPA
│   ├── index.html             # Inter Google-Fonts link
│   ├── src/
│   │   ├── api/               # client.ts, chat.ts, workshop.ts, endpoints.ts
│   │   ├── components/
│   │   │   ├── chat/          # chat-view, message-list, markdown-renderer, ...
│   │   │   ├── layout/        # app-shell (three-panel), sidebar, header, mobile-nav
│   │   │   ├── topics/        # topics-panel, topic-tree, content-viewer
│   │   │   ├── ui/            # toast, command-palette, skeleton, badge
│   │   │   └── shared/        # onboarding-banner
│   │   ├── hooks/             # use-toast, use-command-palette, use-keyboard-shortcuts, ...
│   │   ├── lib/               # topics-data.ts (static workshop tree), export-chat, ...
│   │   ├── pages/             # topics-page, task-page, content-page, chat-page, ...
│   │   ├── stores/            # chat-store, topics-store, toast-store, settings-store
│   │   └── router.tsx
│   ├── Dockerfile             # Multi-stage build
│   └── nginx.conf             # SPA routing config
├── workshop/                  # Teaching materials (served via /api/v1/workshop/content)
│   ├── part1_design_patterns/ # Tasks 1-4 (complete)
│   ├── part2_scalability/     # Tasks 5-8 (pending)
│   └── part3_security/        # Tasks 9-11 (pending)
├── scripts/                   # setup.sh, run_all.sh, check_health.sh, db_bootstrap.sql
├── pyproject.toml             # Python project config
├── Makefile                   # Developer commands
├── .env.example               # Configuration template
└── CLAUDE.md                  # System design directives
```

---

## 6. Request Flow

A typical inference request follows this path:

1. **Browser** sends `POST /api/generate` with a prompt.
2. **Nginx** (prod) or **Vite proxy** (dev) forwards the request to the **API Gateway** on port 8000.
3. **API Gateway** logs the request, starts a timing middleware, validates the payload, and forwards it to the **Model Service** on port 8001.
4. **Model Service** calls the **Groq Cloud API** with the configured model (with fallback logic if the primary model is unavailable).
5. The response streams back through the same chain to the browser.

For background jobs, the **API Gateway** dispatches to the **Worker Service** on port 8002. The worker persists every submission as a row in `batch_jobs` and its background loop dequeues pending rows via `SELECT ... FOR UPDATE SKIP LOCKED`, calling the **Model Service** once per prompt.

**Chat CRUD** (`/api/v1/chat/*`): `POST /sessions` inserts a row in `chat_sessions`; `POST /sessions/{id}/messages` inserts a row in `chat_messages` (and touches the session's `updated_at` so the sidebar re-sorts). `GET /sessions` returns summaries only (the session list endpoint joins a `count(messages)` subquery — see `baseline/api_gateway/app/services/chat_repository.py::list_sessions`); `GET /sessions/{id}` returns a detail envelope with the full ordered message list. All writes attribute to the seeded default user until Part III authentication lands.

**Workshop content**: the browser requests `GET /api/v1/workshop/content?path=part1_design_patterns/task01_rest_vs_grpc/README.md`; the gateway's `workshop.py` route resolves the path under `_WORKSHOP_ROOT`, guards against `..` traversal / absolute paths / non-`.md` files, checks the resolved target is still under the root via `Path.relative_to(_WORKSHOP_ROOT)` (symlink-safe), reads the file, and returns `{content, path}`. The frontend's `ContentViewer` renders the markdown via `MarkdownRenderer`.

---

## 7. Frontend Surface

The SPA uses a **three-panel layout** defined in `frontend/src/components/layout/app-shell.tsx`: a left Sidebar (sessions + nav), a flexible Main content area (`id="main-content"` for the skip-nav link), and a right **Topics Panel** toggled by `useSettingsStore.topicsPanelOpen` (w-80 desktop; overlay with backdrop on mobile, auto-closes on route change <1024px). A global **Command Palette** (`Cmd+K` / `Ctrl+K`, `frontend/src/components/ui/command-palette.tsx`) offers fuzzy search across workshop topics, recent chat sessions, and actions. A **Toast system** (`frontend/src/stores/toast-store.ts` + `components/ui/toast.tsx`) fires typed notifications from any component via `useToast()`, capped at 3 visible.

The new `/topics/*` route tree lives under the same AppShell: `/topics` (grid of Part-grouped task cards, Parts II/III marked Coming-Soon), `/topics/:taskId` (2×2 subtopic grid), and `/topics/:taskId/:subtopicId` (ContentPage — fetches the markdown via `fetchWorkshopContent`, renders through `ContentViewer`, and auto-marks-as-read via `IntersectionObserver` on a bottom sentinel). Read history is stored in `localStorage` under `prodigon-read-history`; chat session state is server-backed and hydrated on app mount.

---

## 8. Workshop Context

The baseline codebase evolves across three workshop parts:

### Part I -- Design Patterns (Tasks 1-4) -- Complete

| Task | Topic | What It Adds |
|------|-------|-------------|
| 1 | REST vs gRPC | gRPC service definitions, benchmarking scripts |
| 2 | Microservices vs Monolith | Service decomposition, inter-service communication |
| 3 | Batch vs Real-time vs Streaming | Three inference pipeline modes |
| 4 | FastAPI Dependency Injection | Injected model loader, config manager, auth middleware |

### Part II -- Scalability & Performance (Tasks 5-8) -- Pending

| Task | Topic | What It Adds |
|------|-------|-------------|
| 5 | Code Profiling & Optimization | cProfile integration, bottleneck analysis |
| 6 | Concurrency & Parallelism | Async handling, threading, multiprocessing comparison |
| 7 | Memory Management | Lazy loading, model sharing, memory monitoring |
| 8 | Load Balancing & Caching | Nginx load balancer, Redis caching layer |

### Part III -- Security (Tasks 9-11) -- Pending

| Task | Topic | What It Adds |
|------|-------|-------------|
| 9 | Authentication vs Authorization | JWT auth, role-based access control |
| 10 | Securing API Endpoints | HTTPS, CORS hardening, rate limiting |
| 11 | Secrets Management | Secret manager abstraction, no hardcoded secrets |

---

## 9. Cross-References

- [Backend Architecture](backend-architecture.md) -- Service internals, shared module design, API contracts
- [Frontend Architecture](frontend-architecture.md) -- Component tree, state management, API client
- [Infrastructure](infrastructure.md) -- Docker setup, Nginx config, networking, environment variables
- [Getting Started](getting-started.md) -- Local setup, running the system, health checks
