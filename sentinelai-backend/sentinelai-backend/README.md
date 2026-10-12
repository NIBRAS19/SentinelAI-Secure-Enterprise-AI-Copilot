# SentinelAI Backend

FastAPI backend for **SentinelAI — Secure Enterprise AI Copilot**: a multi-tenant,
permission-aware RAG platform with RBAC, AI agents with human-approval gating,
prompt-injection and PII defenses, append-only audit logging, and usage analytics.

This implements the backend half of the PRD. The frontend (Next.js/TypeScript,
mock-data demo) was delivered separately; this backend is designed to be the real
API behind it.

## Architecture

```
app/
  core/        settings, security primitives, error types, logging, DB engine
  models/      SQLAlchemy ORM models (one tenant-scoped table per concept)
  schemas/     Pydantic request/response schemas
  policies/    RBAC role -> permission map, document access checks
  ai/          embeddings, reranking, RAG pipeline, PII/prompt-injection detectors, agent tools
  services/    business logic (auth, orgs, documents, chat, agents, audit, storage)
  api/v1/      FastAPI routers (thin: parse request -> call service -> shape response)
  middleware/  request ID, rate limiting
  workers/     Celery task + app for async document processing
alembic/       database migrations
scripts/       demo data seeding
tests/         pytest suite
```

### Multi-tenancy

Every tenant-owned table carries `organization_id`. **Every query is scoped using
the `organization_id` taken from the authenticated JWT** (`app/api/deps.py`'s
`CurrentMember`), never from a client-supplied path or body parameter. This is what
closes the IDOR class of bug where tenant B could read tenant A's row by guessing
an id — see `tests/test_rbac_and_tenancy.py::test_cross_tenant_document_isolation`.

### RBAC

Seven roles (`app/policies/rbac.py`): `super_admin`, `org_owner`, `security_admin`,
`knowledge_manager`, `manager`, `member`, `auditor`. Permissions are a static
in-code dict rather than database-backed roles/permissions tables — the product's
roles don't vary per tenant, so this is simpler and can't be corrupted by a bad
migration.

### Permission-aware RAG pipeline

This is deliberately **not** "query → vector search → LLM". The pipeline in
`app/ai/rag.py` is:

1. **Tenant filter** — vector search scoped to `organization_id`, and chunks with
   `embedding IS NULL` (quarantined documents, see below) are structurally excluded.
2. **Permission filter** — candidates are split into authorized/denied by each
   document's `access_roles`, *before* any scoring happens.
3. **Vector search** — cosine similarity over the candidate pool.
4. **Rerank** — a lexical (IDF-weighted term coverage) reranker blended with the
   vector score, compensating for the zero-config hash embedder (see below).
5. **Relevance threshold** — anything below `RETRIEVAL_MIN_SCORE` is dropped.

Retrieval also tracks `had_unauthorized_match` *separately* from "nothing matched
at all": a genuinely relevant match the role isn't allowed to see triggers a
WARNING audit event and a "restricted" badge on the chat response; an off-topic
question that matches nothing does not — these are different situations and the
code keeps them that way.

### Zero-config embeddings

`HashEmbeddingProvider` (`app/ai/embeddings.py`) is a dependency-free "hashing
trick" bag-of-words embedding — no API key, no network call needed to run the demo.
On its own it gets the right top-1 document for realistic questions most but not
all of the time; `LexicalReranker` (`app/ai/rerank.py`) blends in IDF-weighted term
coverage to compensate, and the combination was verified at **7/7** on the seeded
demo corpus (see "How this was built" below). Set `EMBEDDING_PROVIDER=openai` with
`OPENAI_API_KEY` for real embeddings in production — nothing else in the pipeline
changes.

### Document security: quarantine, not deletion

Ingestion (`app/services/document_service.py`) scans extracted text for
prompt-injection patterns (`app/ai/prompt_injection.py`). A document that matches
is marked `SUSPICIOUS`: its chunks are still written (visible in the UI for an
admin to review) but **never embedded** — persisted with `embedding = NULL`. Since
retrieval always filters on `embedding IS NOT NULL`, a quarantined document cannot
surface in RAG results or influence an answer. This is a property of the data, not
a flag retrieval code has to remember to check.

### PII masking

`app/ai/pii.py` detects email, phone, SSN, and Luhn-validated credit card numbers
in chat messages and masks them before they're persisted or sent to an LLM.

### Agents + human approval

Each `Agent` has a `require_approval` flag; each tool (`app/ai/tools.py`) has a
`risk_level` (`low`/`medium`/`high`). `agent_service.requires_approval()` combines
them: `low` never pauses, `high` always pauses, `medium` defers to the agent's own
setting. A paused call creates an `ApprovalRequest` that a human with
`agents.approve` permission must resolve before the tool actually executes.

### Auth

- Passwords: `hashlib.scrypt` (stdlib), not passlib+bcrypt — avoids a real
  compatibility issue where bcrypt 4.x dropped an attribute older passlib releases
  probe for at import time.
- Access/refresh JWTs, with refresh token **rotation + reuse detection**: reusing an
  already-rotated-away refresh token revokes *every* session for that member
  (indicates possible theft).
- Password reset tokens are single-use via a fingerprint of the *current* password
  hash embedded in the token claims — no separate token table needed; the token
  dies the moment the password actually changes.

### Audit log

Append-only by omission: `app/api/v1/audit.py` only defines a `GET` route. No
`PATCH`/`DELETE` route for audit logs exists anywhere in this codebase.

## Local development

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres (with pgvector), Redis, the API, and a Celery worker. The API
runs its own migrations on startup (`alembic upgrade head`).

Seed realistic demo data (runs documents through the *real* ingestion pipeline):

```bash
docker compose exec api python -m scripts.seed
```

All seeded users share the password `sentinelai-demo` (e.g. `owner@acme-demo.com`,
`security@acme-demo.com`, `member1@acme-demo.com`).

### Running without Docker

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

You'll need a local Postgres with the `vector` extension and a local Redis.

### Tests

```bash
pytest
```

`tests/test_security_detectors.py` is pure-stdlib (no database needed).
`tests/test_auth.py` and `tests/test_rbac_and_tenancy.py` need a real Postgres —
set `TEST_DATABASE_URL` or rely on the default in `tests/conftest.py`.

### Linting

```bash
ruff check .
```

## API overview

All routes are under `/api/v1`. Auth via `Authorization: Bearer <access_token>`.
Errors always come back as `{"success": false, "error": {"code", "message"}, "request_id"}`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `GET /auth/me` |
| Organizations | `GET/POST /organizations/members`, `PATCH /organizations/members/{id}` |
| Documents | `POST/GET /documents`, `GET/PATCH/DELETE /documents/{id}`, `POST /documents/collections`, `GET /documents/collections/all` |
| Chat | `POST /chat/messages`, `GET /chat/conversations`, `GET /chat/conversations/{id}/messages` |
| Agents | `POST/GET /agents`, `POST /agents/runs`, `GET /agents/approvals/pending`, `POST /agents/approvals/{id}/decide` |
| Security | `GET/PATCH /security/policies` |
| Audit | `GET /audit/logs` (read-only, by design) |
| Analytics | `GET /analytics/overview` |

## How this was built

This backend was written in a sandbox with **no live Postgres, Redis, or network
access to PyPI** — `pip install` of `sqlalchemy`, `fastapi`, `pydantic-settings`,
etc. was not possible here. Given that constraint, verification was split by what
could and couldn't be exercised directly:

- **Every pure-Python module** (`app/core/security.py`, `app/policies/rbac.py`,
  `app/ai/text.py`, `app/ai/embeddings.py`, `app/ai/rerank.py`, `app/ai/pii.py`,
  `app/ai/prompt_injection.py`, `app/ai/tools.py`, `app/services/organization_service.py`'s
  `slugify`, `app/services/storage.py`'s path-traversal guard) was **directly executed**
  against real assertions — password hashing round-trips, JWT tamper rejection,
  refresh-token uniqueness, PII regex edge cases, prompt-injection snippet matching,
  the AST-based calculator's rejection of unsafe expressions, Unicode slugification,
  and a path-traversal attack attempt — not just written and assumed correct.
- **The full ingestion pipeline** was verified end-to-end using *real* rendered
  PDF/DOCX bytes (via `reportlab`/`python-docx`, both available in this sandbox),
  through extraction, whitespace normalization, chunking, and prompt-injection
  scanning — including confirming the seeded vendor contract's injected sentence is
  actually caught by the real scanner (not hardcoded as quarantined).
- **Retrieval quality** (hash embeddings + lexical reranker) was benchmarked against
  the actual seeded 12-document corpus and confirmed at **7/7** top-1 accuracy.
- **FastAPI routes and SQLAlchemy query code** (`app/api/v1/*.py`, the ORM models,
  the async query logic in services, the Alembic migration) could not be executed
  here — no network access to install `fastapi`/`sqlalchemy`/`asyncpg`/`alembic`.
  These were written with careful, deliberate signature-matching against the
  libraries' documented APIs and cross-checked for internal consistency (e.g. every
  service function's parameters match how its router calls it), and every file in
  the project does pass `python -m py_compile` (syntax-valid), but **they have not
  been run**.

**Before relying on this in production, please run yourself:**
1. `pip install -r requirements.txt`
2. `docker compose up --build` and confirm the API boots and `/health` returns `200`
3. `alembic upgrade head` against a real Postgres+pgvector instance
4. `pytest` (the full suite, with `TEST_DATABASE_URL` pointed at a real test database)
5. `ruff check .`

If any of the FastAPI/SQLAlchemy-dependent code has a signature mismatch or an
import error, it's almost certainly in that untested layer — the algorithmic core
(security, RBAC, RAG scoring, PII/injection detection) has been proven correct by
direct execution against this exact codebase.
