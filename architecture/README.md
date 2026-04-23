<!-- Version: v1 | Last updated: 2026-04-23 | Status: current -->

# Prodigon Architecture Documentation

Comprehensive architecture documentation for the Prodigon AI platform — a multi-service AI assistant built with FastAPI, React, and Groq.

## Document Index

| Document | Purpose | Version |
|----------|---------|---------|
| [System Overview](system-overview.md) | High-level architecture, tech stack, service inventory, repo structure | v1 |
| [Backend Architecture](backend-architecture.md) | Services deep dive: Gateway, Model, Worker, Shared module, DI pattern | v1 |
| [Frontend Architecture](frontend-architecture.md) | React SPA: components, stores, hooks, streaming, build pipeline | v1 |
| [API Reference](api-reference.md) | Complete endpoint reference with schemas, examples, and error codes | v1 |
| [Data Flow](data-flow.md) | User flows with sequence diagrams: streaming, jobs, health monitoring | v1 |
| [Infrastructure](infrastructure.md) | Docker, Nginx, networking, deployment modes, environment config | v1 |
| [Getting Started](getting-started.md) | Step-by-step setup guide with troubleshooting for all known issues | v1 |
| [Design Decisions](design-decisions.md) | 8 Architecture Decision Records (ADRs) with rationale | v1 |

## Reading Order

**New to the project?** Start here:
1. [Getting Started](getting-started.md) — set up and run the system
2. [System Overview](system-overview.md) — understand the big picture
3. [Data Flow](data-flow.md) — see how requests flow through the system

**Backend developer?**
1. [Backend Architecture](backend-architecture.md) — services, DI, config, shared module
2. [API Reference](api-reference.md) — endpoint contracts

**Frontend developer?**
1. [Frontend Architecture](frontend-architecture.md) — components, stores, streaming
2. [API Reference](api-reference.md) — what the backend provides

**Understanding design choices?**
1. [Design Decisions](design-decisions.md) — why things are built this way

**Deploying or configuring?**
1. [Infrastructure](infrastructure.md) — Docker, Nginx, ports, env vars

## Versioning Policy

These documents are **Version 1 (v1)** — adds Postgres persistence, durable worker queue, polished frontend v2 (Topics Panel, Command Palette, Toast, workshop content), 2026-04-23. v0 snapshot archived at `versions/v0/`.

### When to version

Create a new version when:
- Service boundaries change (new service added, service merged/split)
- New infrastructure components added (e.g., Redis queue in Task 8, JWT auth in Task 9)
- Breaking API changes (endpoint paths, request/response schemas)
- Major frontend restructuring

Do **not** version for:
- Typo fixes or clarification improvements
- Adding detail to existing sections
- Minor bug fixes that don't change architecture

### How to version

1. Copy all current files to `architecture/versions/v0/`
2. Update the version header in each main file: `<!-- Version: v1 | Last updated: YYYY-MM-DD | Status: current -->`
3. Update the version column in the Document Index table above
4. Add a changelog entry below

### Changelog

| Version | Date | Summary |
|---------|------|---------|
| v1 | 2026-04-23 | (1) Polished frontend v2: Topics Panel, Command Palette (Cmd+K), Toast notifications, workshop content API (/api/v1/workshop/content), /topics/* routes, onboarding banner, chat export, session stats, accessibility (skip-nav, focus trap, aria-current), Inter font, three-panel layout. (2) Postgres 16 persistence: chat sessions/messages/batch jobs, durable SKIP LOCKED queue, 6 /api/v1/chat/* endpoints, server-backed frontend chat store, native-Postgres dev workflow. v0 snapshot at versions/v0/. |
| v0 | 2026-04-16 | Initial architecture documentation. Covers baseline services, React frontend, Docker infrastructure, and 8 ADRs. |

## Diagrams

Architecture diagrams use [Mermaid](https://mermaid.js.org/) syntax. They render natively on GitHub. For local viewing, use:
- VS Code: [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension
- JetBrains: Built-in Mermaid support in markdown preview
- CLI: `npx @mermaid-js/mermaid-cli` for PNG/SVG export
