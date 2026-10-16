# Optimization Roadmap

This roadmap prioritizes improvements to local setup, service boundaries, and operating the existing Sigil AI Atelier application. It is intentionally implementation-focused: each item has a concrete completion condition, and work should preserve the current React, Express/MongoDB, and FastAPI architecture unless a measured need justifies a larger change.

## Priorities

### P0 — Make configuration safe and reproducible

- Add sanitized `.env.example` files for the backend and AI engine, documenting which settings are required and which integrations are optional.
- Require explicit production secrets instead of relying on the backend's built-in JWT fallback.
- Document and validate that the backend and engine use the same encryption key.
- Provide a repeatable local setup path for MongoDB, the backend, engine, and dashboard.

**Done when:** a new contributor can configure the services from examples without copying secrets, and invalid or missing production secrets fail clearly.

### P1 — Remove environment-specific frontend endpoints

- Replace hard-coded `http://localhost:5000` frontend requests with one configurable API base URL.
- Centralize the URL so API calls, OAuth popup flows, public API examples, and embedded widget references cannot silently diverge.
- Keep localhost as the development default while allowing deployment-specific configuration.

**Done when:** the frontend can target a non-local backend through documented configuration, with the local development path unchanged.

### P1 — Improve service readiness and diagnostics

- Add or document health/readiness checks for the backend, engine, and MongoDB dependency.
- Make startup failures for missing dependencies and configuration actionable, rather than relying on logs from a later request.
- Keep diagnostics free of credential fragments; expose only non-sensitive status information.

**Done when:** operators can distinguish a running process from a service that is ready to handle requests, without diagnostics revealing secrets.

### P2 — Make local retrieval data lifecycle explicit

- Define which Qdrant and BM25 files are runtime data, which are fixtures, and how each can be rebuilt.
- Keep generated indexes and local test data out of routine source changes unless they are deliberately maintained fixtures.
- Document persistence, backup, and reset behavior for local knowledge bases.

**Done when:** a contributor can rebuild the retrieval data from source documents and knows which local files are safe to remove or preserve.

### P2 — Add focused automated coverage

- Cover the API/engine handoff and the frontend's configured API URL.
- Add regression cases for agent runs, knowledge ingestion/retrieval, and database access guardrails.
- Keep test commands and prerequisites documented alongside the relevant service.

**Done when:** the core service boundaries and critical data paths have repeatable automated checks that run without production credentials.

## Working constraints

- Make changes in small, independently reviewable increments.
- Preserve API behavior unless a change is intentional, documented, and covered by regression tests.
- Avoid broad performance rewrites without measurements; record a baseline and target before optimizing runtime or retrieval costs.
- Never place real credentials, customer data, or production database snapshots in the repository.

## Suggested sequence

1. Establish safe configuration examples and reliable local setup (P0).
2. Centralize frontend API configuration and improve readiness signals (P1).
3. Clarify retrieval-data lifecycle and add focused regression coverage (P2).

No implementation status is implied by this roadmap; mark items complete only after their completion conditions are met.
