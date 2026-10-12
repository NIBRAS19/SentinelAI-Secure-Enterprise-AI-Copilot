# SentinelAI — Secure Enterprise AI Copilot

> A multi-tenant, permission-aware RAG platform with RBAC, AI agents with human-approval gating, prompt-injection and PII defenses, append-only audit logging, and usage analytics.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Project Structure](#5-project-structure)
6. [Prerequisites](#6-prerequisites)
7. [Installation & Local Setup](#7-installation--local-setup)
   - [Option A — Docker (Recommended, Production-Grade)](#option-a--docker-recommended-production-grade)
   - [Option B — Bare-Metal with PostgreSQL + pgvector](#option-b--bare-metal-with-postgresql--pgvector)
8. [Environment Variables](#8-environment-variables)
9. [Database Design](#9-database-design)
10. [API Reference](#10-api-reference)
11. [User Roles & Permissions](#11-user-roles--permissions)
12. [Security Architecture](#12-security-architecture)
13. [AI Pipeline Deep Dive](#13-ai-pipeline-deep-dive)
14. [Agent System](#14-agent-system)
15. [Development Commands](#15-development-commands)
16. [Testing](#16-testing)
17. [Deployment](#17-deployment)
18. [Troubleshooting](#18-troubleshooting)
19. [Known Limitations & Roadmap](#19-known-limitations--roadmap)

---

## 1. Project Overview

### What Is SentinelAI?

SentinelAI is a **secure, multi-tenant Retrieval-Augmented Generation (RAG) platform** designed for enterprises that need to expose AI capabilities to their employees without sacrificing security, auditability, or access control.

It answers a question that most AI copilot platforms ignore: *"What happens when a user uploads a malicious document, or when the AI answers a question the user isn't authorized to ask?"*

SentinelAI enforces authorization at every layer of the AI pipeline — not as an afterthought, but as a structural property of the data model and retrieval logic.

### The Problem It Solves

| Problem | How SentinelAI Addresses It |
|---|---|
| Employees querying documents they shouldn't see | Permission-aware retrieval: RBAC role checked before any chunk enters the LLM context |
| Prompt-injection attacks via uploaded documents | Real-time scanner quarantines suspicious documents; they can never surface in RAG results |
| AI agents executing dangerous actions without oversight | Human-approval gating: high-risk tool calls pause for an authorized reviewer |
| No accountability for AI usage | Append-only audit log captures every login, retrieval, tool call, and policy change |
| PII leaking into AI prompts | Automatic PII masking before content is persisted or sent to an LLM |
| Vendor lock-in for embeddings/LLM | Pluggable providers: hash (zero-config), OpenAI, Anthropic, or Ollama |

### Target Audience

- Enterprise engineering and security teams building internal AI tools
- Organizations in regulated industries (finance, healthcare, legal) where data access control is mandatory
- Developers evaluating a production-ready RAG reference architecture

### Current Status

The backend API (FastAPI + PostgreSQL + pgvector) is the primary deliverable. The frontend (Next.js 14) is a portfolio demonstration running on mock data; wiring it to the real backend API is the next phase of work.

---

## 2. Key Features

### 🔐 Authentication & Session Management

- **JWT access + opaque refresh tokens** with automatic rotation on every refresh
- **Reuse detection**: presenting an already-rotated refresh token immediately revokes all sessions for that member (theft signal)
- **Stateless password reset tokens** fingerprinted against the current password hash — the token self-destructs the moment the password changes, with no separate token table
- Timing-safe login: unknown email paths perform the same hash computation as known ones, preventing email enumeration via response time

### 🏢 Multi-Tenancy

- Every table row carries `organization_id`
- Every query is scoped by the `organization_id` extracted from the authenticated JWT, never from a client-supplied body or path parameter
- Cross-tenant IDOR is structurally impossible: `app/api/deps.py`'s `CurrentMember` dependency always resolves to the authenticated user's own organization

### 👥 Role-Based Access Control (RBAC)

Seven roles with static, in-code permissions (not a database table):

| Role | Primary Capability |
|---|---|
| `super_admin` | Platform operator — bypasses all per-permission checks |
| `org_owner` | Full organizational control |
| `security_admin` | Security policies, audit log, approve agents |
| `knowledge_manager` | Upload, edit, delete documents and collections |
| `manager` | Read documents, use chat, manage and approve agents |
| `member` | Read documents, use chat |
| `auditor` | Read-only: audit log, security view, analytics |

### 📄 Document Ingestion Pipeline

State machine: `UPLOADED → VALIDATING → EXTRACTING → CHUNKING → EMBEDDING → INDEXING → READY`

Supports:
- **PDF** (pypdf, page-level extraction)
- **DOCX** (python-docx, paragraph extraction)
- **Plain text / Markdown**

Processing is configurable: inline via FastAPI `BackgroundTasks` (default, no worker needed) or async via Celery worker.

### 🧠 Permission-Aware RAG Pipeline

The retrieval pipeline is deliberately **not** a simple "vector search → LLM" chain:

1. **Tenant filter** — vector search scoped to `organization_id`
2. **Embedding IS NOT NULL filter** — structurally excludes quarantined documents
3. **Permission filter** — candidates split into authorized/denied by each document's `access_roles` *before* scoring
4. **Vector search** — cosine similarity (pgvector HNSW index)
5. **Lexical rerank** — IDF-weighted term coverage blended with vector score
6. **Relevance threshold** — anything below `RETRIEVAL_MIN_SCORE` dropped

Crucially, `had_unauthorized_match` is tracked separately from "nothing matched" — a genuinely relevant result the user can't see triggers a `WARNING` audit event and a "restricted" badge on the response.

### 🛡️ Prompt-Injection Defense

Every document upload is scanned by `app/ai/prompt_injection.py` against a compiled set of patterns (e.g., "ignore previous instructions", "you are now in developer mode"). A match marks the document `SUSPICIOUS`:

- Chunks are still written so admins can review them in the UI
- Embeddings are **never generated** for SUSPICIOUS chunks (`embedding = NULL`)
- Retrieval filters on `embedding IS NOT NULL` — SUSPICIOUS documents are structurally unreachable, not just flagged

### 🔒 PII Masking

`app/ai/pii.py` detects and masks before content is persisted or sent to an LLM:

- Email addresses (with lookahead/lookbehind to avoid trailing punctuation)
- Phone numbers (US format, with negative lookahead for adjacent digits)
- Social Security Numbers (`NNN-NN-NNNN`)
- Credit card numbers (Luhn-validated to eliminate false positives)

### 🤖 AI Agents with Human-Approval Gating

Agents have a `require_approval` flag; each tool has a `risk_level` (`low` / `medium` / `high`):

| Tool | Risk | Auto-approval? |
|---|---|---|
| `calculator` | `low` | Always (AST-safe, no eval) |
| `knowledge_search` | `low` | Always |
| `crm_lookup` | `medium` | Depends on agent's `require_approval` flag |
| `http_api` | `high` | Never — always requires human sign-off |

A paused agent run creates an `ApprovalRequest`. An authorized reviewer (`agents.approve` permission) must decide before execution continues.

> **Note:** `crm_lookup` and `http_api` are simulated stubs in this reference implementation. Connect real integrations to replace them.

### 📊 Analytics

`GET /api/v1/analytics/overview` returns (for authorized roles):
- Total documents, ready count, quarantined count
- Total assistant messages and restricted response count
- Total token consumption

### 📋 Audit Log

Append-only by architecture: only a `GET` route is defined for `/api/v1/audit/logs`. No `PATCH` or `DELETE` route exists anywhere in the codebase.

Every significant action writes a structured audit event: document upload, quarantine, ingestion failure, login, policy change, tool execution, approval decision.

### 🔌 LLM Provider Flexibility

| Provider | Config | Notes |
|---|---|---|
| `none` (default) | No key required | Deterministic templated answers from retrieved chunks |
| `anthropic` | `ANTHROPIC_API_KEY` | Claude models |
| `openai` | `OPENAI_API_KEY` | GPT models |
| `ollama` | Local endpoint | Self-hosted Ollama |

### 🔢 Embedding Provider Flexibility

| Provider | Config | Notes |
|---|---|---|
| `hash` (default) | None | Zero-config bag-of-words hashing trick; 1536-dim vectors |
| `openai` | `OPENAI_API_KEY` | `text-embedding-3-small` |

Both return a `list[float]` of the same `EMBEDDING_DIM` — the rest of the pipeline is provider-agnostic.

---

## 3. Technology Stack

### Backend

| Technology | Version | Role |
|---|---|---|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.115.6 | Async HTTP framework, OpenAPI generation |
| **SQLAlchemy** | 2.0.36 | Async ORM (mapped_column, DeclarativeBase) |
| **asyncpg** | 0.30.0 | Async PostgreSQL driver |
| **pgvector** | 0.3.6 | PostgreSQL vector extension (HNSW index for embeddings) |
| **Alembic** | 1.14.0 | Database migrations |
| **Pydantic v2** | 2.10.4 | Request/response schemas, settings |
| **pydantic-settings** | 2.7.1 | `.env` → typed `Settings` class |
| **PyJWT** | 2.10.1 | JWT encoding/decoding |
| **pypdf** | 5.1.0 | PDF text extraction |
| **python-docx** | 1.1.2 | DOCX text extraction |
| **reportlab** | 4.2.5 | PDF generation (seed script) |
| **Celery** | 5.4.0 | Async document processing worker |
| **Redis** | 5.2.1 | Celery broker + rate-limit counter store |
| **Anthropic SDK** | 0.40.0 | Claude LLM integration |
| **OpenAI SDK** | 1.58.1 | GPT + embeddings integration |
| **httpx** | 0.28.1 | Async HTTP client |
| **Ruff** | 0.8.4 | Linting |

### Frontend

| Technology | Version | Role |
|---|---|---|
| **Next.js** | 14.2.15 | React framework, App Router |
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.5.4 | Type safety |
| **Tailwind CSS** | 3.4.10 | Utility-first styling |
| **Recharts** | 2.12.7 | Analytics charts |
| **lucide-react** | 0.441.0 | Icon library |
| **clsx + tailwind-merge** | latest | Conditional class utilities |

### Infrastructure

| Technology | Role |
|---|---|
| **PostgreSQL 15 + pgvector** | Primary database + vector index |
| **Redis 7** | Celery broker, result backend, rate limiting |
| **Docker + Docker Compose** | Local and production container orchestration |
| **Alembic** | Schema versioning and migrations |

---

## 4. Architecture

### High-Level Architecture

```mermaid
flowchart TB
    subgraph FE["Frontend (Next.js 14)"]
        UI["UI Pages\n(mock data)"]
    end

    subgraph BE["Backend (FastAPI)"]
        MW["Middleware\nRequestID · RateLimit · CORS"]
        Router["API Routers\n/auth /documents /chat /agents\n/security /audit /analytics /organizations"]
        Deps["Deps Layer\nJWT decode → CurrentMember\nRBAC permission check"]
        Services["Business Services\nauth · chat · document · agent\norganization · audit · llm · storage"]
        AI["AI Layer\nembeddings · rag · rerank\npii · prompt_injection · tools"]
    end

    subgraph DB["Data Layer"]
        PG[("PostgreSQL\n+ pgvector")]
        RD[("Redis\nrate limits · celery broker")]
        FS["Local File Storage\n./storage"]
    end

    subgraph Workers["Background"]
        Celery["Celery Worker\ndocument ingestion"]
    end

    FE --"HTTP /api/v1"--> MW
    MW --> Router
    Router --> Deps
    Deps --> Services
    Services --> AI
    Services --> PG
    Services --> FS
    Services --> Celery
    Celery --> PG
    Celery --> RD
    MW --> RD
```

### Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant RBAC
    participant ChatService
    participant RAG
    participant PII
    participant LLM
    participant DB

    Client->>FastAPI: POST /api/v1/chat/messages<br/>Authorization: Bearer <token>
    FastAPI->>RBAC: Decode JWT → verify role has "chat.use"
    RBAC-->>FastAPI: CurrentMember (org_id, role)
    FastAPI->>ChatService: send_message(org_id, role, content)
    ChatService->>PII: detect_pii(content)
    PII-->>ChatService: masked_content
    ChatService->>RAG: retrieve_relevant_chunks(org_id, role, query_embedding)
    RAG->>DB: SELECT chunks WHERE org_id=? AND embedding IS NOT NULL
    RAG->>RAG: permission filter (access_roles vs role)
    RAG->>RAG: cosine rerank + threshold
    RAG-->>ChatService: RetrievalResult(chunks, had_unauthorized_match)
    ChatService->>LLM: generate_answer(query, chunks)
    LLM-->>ChatService: answer + citations
    ChatService->>DB: INSERT message (content, citations, restricted, pii_masked)
    ChatService-->>FastAPI: MessageOut
    FastAPI-->>Client: 200 {id, content, citations, restricted}
```

### Document Ingestion Pipeline

```mermaid
stateDiagram-v2
    [*] --> UPLOADED: POST /documents (file upload)
    UPLOADED --> VALIDATING: process_document() starts
    VALIDATING --> EXTRACTING: file bytes loaded from storage
    EXTRACTING --> CHUNKING: text extracted + normalized
    CHUNKING --> EMBEDDING: text chunked into pieces
    CHUNKING --> INDEXING: security_status = SUSPICIOUS\n(embeddings skipped — quarantine)
    EMBEDDING --> INDEXING: embeddings generated + persisted
    INDEXING --> READY: all chunks written
    VALIDATING --> FAILED: any exception
    EXTRACTING --> FAILED: any exception
    CHUNKING --> FAILED: any exception
    EMBEDDING --> FAILED: any exception
    FAILED --> [*]: error logged to audit
    READY --> [*]
    INDEXING --> [*]
```

---

## 5. Project Structure

```text
SentinelAI — Secure Enterprise AI Copilot/
│
├── sentinelai-backend/
│   └── sentinelai-backend/          # Python backend root
│       ├── app/
│       │   ├── main.py              # FastAPI factory, middleware registration, router mounting
│       │   ├── core/
│       │   │   ├── config.py        # Pydantic Settings (all env vars in one place)
│       │   │   ├── database.py      # Async SQLAlchemy engine + AsyncSession + get_db dep
│       │   │   ├── security.py      # hashlib.scrypt passwords, JWT utils, token fingerprinting
│       │   │   ├── errors.py        # AppError hierarchy (NotFound, Forbidden, Unauthorized…)
│       │   │   └── logging.py       # Structured logging configuration
│       │   ├── models/              # SQLAlchemy ORM models
│       │   │   ├── mixins.py        # UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin
│       │   │   ├── member.py        # User/member (scoped to org)
│       │   │   ├── organization.py  # Tenant root
│       │   │   ├── session.py       # Refresh token rows (hashed, revocable)
│       │   │   ├── document.py      # Uploaded file metadata + ingestion status
│       │   │   ├── chunk.py         # Document chunk + pgvector embedding
│       │   │   ├── collection.py    # Document grouping
│       │   │   ├── conversation.py  # Chat conversation
│       │   │   ├── message.py       # Chat message (user + assistant)
│       │   │   ├── agent.py         # AI agent definition
│       │   │   ├── agent_run.py     # Agent execution record + steps
│       │   │   ├── approval_request.py # Human-approval gating record
│       │   │   ├── audit_log.py     # Append-only event log
│       │   │   ├── security_policy.py  # Per-org security settings
│       │   │   └── usage_event.py   # Token consumption events
│       │   ├── schemas/             # Pydantic v2 request/response models
│       │   ├── policies/
│       │   │   └── rbac.py          # Role enum, ROLE_PERMISSIONS dict, has_permission()
│       │   ├── ai/
│       │   │   ├── constants.py     # EMBEDDING_DIM = 1536
│       │   │   ├── embeddings.py    # HashEmbeddingProvider + OpenAIEmbeddingProvider
│       │   │   ├── pii.py           # Regex PII detection + Luhn card validation + masking
│       │   │   ├── prompt_injection.py # Pattern-based injection scanner
│       │   │   ├── rag.py           # Full retrieval pipeline (tenant → permission → cosine → rerank)
│       │   │   ├── rerank.py        # LexicalReranker (IDF-weighted term coverage)
│       │   │   ├── text.py          # Text normalization + chunking utilities
│       │   │   └── tools.py         # Agent tool registry (calculator, knowledge_search, crm_lookup, http_api)
│       │   ├── services/            # Business logic layer (called by routers)
│       │   │   ├── auth_service.py  # Register, login, refresh (rotation+reuse detection), logout, password reset
│       │   │   ├── chat_service.py  # Message send (PII mask → RAG → LLM → persist)
│       │   │   ├── document_service.py # Upload + full ingestion pipeline
│       │   │   ├── agent_service.py # Run agent, resolve approval
│       │   │   ├── organization_service.py # Create org + owner
│       │   │   ├── audit_service.py # record_event() helper
│       │   │   ├── llm_service.py   # generate_answer() (none/anthropic/openai)
│       │   │   └── storage.py       # Local filesystem storage (path-traversal guarded)
│       │   ├── api/
│       │   │   ├── deps.py          # get_current_member, CurrentMember, require() factory
│       │   │   └── v1/              # FastAPI routers (thin: parse → service → shape)
│       │   │       ├── auth.py      # /auth/*
│       │   │       ├── documents.py # /documents/* + /documents/collections/*
│       │   │       ├── chat.py      # /chat/messages + /chat/conversations/*
│       │   │       ├── agents.py    # /agents/* + /agents/runs + /agents/approvals/*
│       │   │       ├── organizations.py # /organizations/members
│       │   │       ├── security.py  # /security/policies
│       │   │       ├── audit.py     # /audit/logs (read-only)
│       │   │       └── analytics.py # /analytics/overview
│       │   ├── middleware/
│       │   │   ├── request_id.py    # Injects X-Request-ID on every request
│       │   │   └── rate_limit.py    # Fixed-window IP rate limiting (Redis INCR+EXPIRE)
│       │   └── workers/
│       │       └── tasks.py         # Celery task: process_document_task
│       ├── alembic/
│       │   ├── env.py               # Migration environment
│       │   └── versions/
│       │       └── 0001_initial_schema.py  # Hand-written initial migration
│       ├── scripts/
│       │   ├── seed.py              # Demo data seeder (runs real ingestion pipeline)
│       │   └── seed_content.py      # Demo document content + user definitions
│       ├── tests/
│       │   ├── conftest.py          # Pytest fixtures, test DB setup
│       │   ├── test_auth.py         # Auth flow integration tests
│       │   ├── test_rbac_and_tenancy.py  # RBAC + cross-tenant isolation tests
│       │   └── test_security_detectors.py # Pure-Python PII + injection unit tests
│       ├── .env.example
│       ├── requirements.txt
│       ├── alembic.ini
│       ├── docker-compose.yml
│       ├── Dockerfile
│       └── Dockerfile.worker
│
└── sentinelai-frontend/
    └── sentinel-ai/                 # Next.js 14 App Router frontend
        ├── app/
        │   ├── page.tsx             # Marketing/landing page
        │   ├── layout.tsx           # Root layout
        │   ├── globals.css          # Global styles
        │   ├── (auth)/              # Login / register pages
        │   └── (app)/               # Authenticated app shell
        │       ├── dashboard/       # Overview dashboard
        │       ├── chat/            # AI chat interface
        │       ├── knowledge/       # Document management
        │       ├── agents/          # Agent management
        │       ├── approvals/       # Pending approval queue
        │       ├── security/        # Security policy management
        │       ├── audit/           # Audit log viewer
        │       ├── usage/           # Token usage analytics
        │       └── admin/           # Admin panel
        ├── components/
        │   ├── chat/                # Chat UI components
        │   ├── knowledge/           # Document UI components
        │   ├── agents/              # Agent UI components
        │   ├── security/            # Security UI components
        │   ├── layout/              # Sidebar, navbar components
        │   └── ui/                  # Base design system (buttons, cards, etc.)
        ├── lib/                     # Shared utilities
        ├── .env.example
        ├── next.config.mjs
        ├── tailwind.config.ts
        └── package.json
```

---

## 6. Prerequisites

### For Docker setup (recommended)

| Tool | Minimum Version | Purpose |
|---|---|---|
| Docker Desktop | 24.0+ | Container runtime |
| Docker Compose | v2 (bundled with Docker Desktop) | Multi-container orchestration |
| Node.js | 18+ | Frontend development |
| npm | 9+ | Frontend dependency management |

### For bare-metal setup

| Tool | Minimum Version | Purpose |
|---|---|---|
| Python | 3.11+ | Backend runtime |
| pip | 23+ | Python package manager |
| PostgreSQL | 15+ | Primary database |
| pgvector extension | 0.5.0+ | Vector similarity search |
| Redis | 7+ | Rate limiting + Celery broker |
| Node.js | 18+ | Frontend development |

---

## 7. Installation & Local Setup

### Option A — Docker (Recommended, Production-Grade)

This is the **canonical setup**. It starts PostgreSQL with pgvector, Redis, the API server (with auto-migration on startup), and a Celery worker.

#### Step 1: Clone and navigate

```bash
git clone <repository-url>
cd "SentinelAI — Secure Enterprise AI Copilot/sentinelai-backend/sentinelai-backend"
```

#### Step 2: Configure environment

```bash
cp .env.example .env
```

Edit `.env` — at minimum, set strong secrets for production:

```env
APP_SECRET=your-strong-secret-here
JWT_SECRET=your-jwt-secret-here
```

For LLM features, add your provider key:

```env
LLM_PROVIDER=anthropic        # or: openai | ollama | none
ANTHROPIC_API_KEY=sk-ant-...  # if using Anthropic
OPENAI_API_KEY=sk-...         # if using OpenAI
```

#### Step 3: Start all services

```bash
docker compose up --build
```

This starts:
- **postgres** — PostgreSQL 15 + pgvector on port `5432`
- **redis** — Redis 7 on port `6379`
- **api** — FastAPI on port `8000` (runs `alembic upgrade head` on startup, then uvicorn)
- **worker** — Celery worker for async document processing

Wait for all health checks to pass (typically 15-20 seconds).

#### Step 4: Verify the API is running

```bash
curl http://localhost:8000/health
# → {"status": "ok"}

# Browse interactive API docs:
# http://localhost:8000/docs
```

#### Step 5: Seed demo data

```bash
docker compose exec api python -m scripts.seed
```

This runs the **real** ingestion pipeline — PDF/DOCX documents are generated from raw text, uploaded, chunked, embedded, and scanned for prompt injection. The vendor contract document will be marked `SUSPICIOUS` because the scanner genuinely finds the injected sentence.

Demo credentials (password: `sentinelai-demo`):

| Email | Role |
|---|---|
| `owner@acme-demo.com` | `org_owner` |
| `security@acme-demo.com` | `security_admin` |
| `km@acme-demo.com` | `knowledge_manager` |
| `manager@acme-demo.com` | `manager` |
| `member1@acme-demo.com` | `member` |
| `auditor@acme-demo.com` | `auditor` |

#### Step 6: Start the frontend

```bash
cd "../../sentinelai-frontend/sentinel-ai"
npm install
cp .env.example .env.local
npm run dev
```

Frontend available at: **http://localhost:3000**

> **Note:** The frontend currently runs on mock data. To connect it to the real API, update `lib/` API calls to use `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`.

---

### Option B — Bare-Metal with PostgreSQL + pgvector

Use this if you have a local PostgreSQL instance and want to run without Docker.

#### Step 1: Set up PostgreSQL + pgvector

```sql
-- In psql:
CREATE USER sentinel WITH PASSWORD 'sentinel';
CREATE DATABASE sentinelai OWNER sentinel;
\c sentinelai
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Step 2: Create Python virtual environment

```bash
cd sentinelai-backend/sentinelai-backend
python -m venv .venv

# Windows:
.venv\Scripts\activate

# macOS/Linux:
source .venv/bin/activate
```

#### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

#### Step 4: Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinelai
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
PROCESS_DOCUMENTS_INLINE=true    # avoids needing the Celery worker locally
JWT_SECRET=your-local-dev-secret
APP_SECRET=your-local-dev-secret
```

#### Step 5: Run migrations

```bash
alembic upgrade head
```

#### Step 6: Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

#### Step 7: (Optional) Seed demo data

```bash
python -m scripts.seed
```

#### Step 8: Start the frontend

```bash
cd ../../sentinelai-frontend/sentinel-ai
npm install
npm run dev
```

---

## 8. Environment Variables

### Backend (`sentinelai-backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_ENV` | No | `development` | Environment name; controls log verbosity |
| `APP_SECRET` | **Yes** | `change-me-in-production-please` | Application secret — change in production |
| `DATABASE_URL` | **Yes** | PostgreSQL URL | Full async SQLAlchemy connection string |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection for rate limiting |
| `CELERY_BROKER_URL` | No | `redis://localhost:6379/1` | Celery task broker |
| `CELERY_RESULT_BACKEND` | No | `redis://localhost:6379/2` | Celery result store |
| `JWT_SECRET` | **Yes** | `change-me-in-production-please` | JWT signing secret — must be long and random |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `14` | Refresh token lifetime |
| `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` | No | `30` | Password reset token lifetime |
| `LLM_PROVIDER` | No | `none` | LLM provider: `none` \| `anthropic` \| `openai` \| `ollama` |
| `ANTHROPIC_API_KEY` | If `anthropic` | `""` | Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-5` | Anthropic model name |
| `OPENAI_API_KEY` | If `openai` | `""` | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `OLLAMA_BASE_URL` | If `ollama` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | No | `llama3.1` | Ollama model name |
| `EMBEDDING_PROVIDER` | No | `hash` | Embedding provider: `hash` \| `openai` |
| `RERANKER_PROVIDER` | No | `lexical` | Reranker: `lexical` \| `passthrough` |
| `RETRIEVAL_TOP_K` | No | `4` | Number of top chunks returned to LLM |
| `RETRIEVAL_CANDIDATE_POOL` | No | `20` | Vector search pool size before reranking |
| `RETRIEVAL_MIN_SCORE` | No | `0.42` | Minimum relevance score threshold |
| `STORAGE_DIR` | No | `./storage` | Local file storage directory |
| `MAX_UPLOAD_MB` | No | `25` | Maximum file upload size in MB |
| `PROCESS_DOCUMENTS_INLINE` | No | `true` | `true` = BackgroundTasks; `false` = Celery |
| `CORS_ORIGINS` | No | `["http://localhost:3000"]` | Allowed CORS origins (JSON array) |
| `RATE_LIMIT_REQUESTS` | No | `100` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Rate limit window duration |

### Frontend (`sentinelai-frontend/sentinel-ai/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | No | `development` | Environment name |
| `NEXT_PUBLIC_API_BASE_URL` | No | `http://localhost:8000/api/v1` | Backend API base URL |

> ⚠️ **Security**: Never commit real API keys, JWT secrets, or database credentials to version control. Use environment-specific secrets managers in production.

---

## 9. Database Design

### Entity-Relationship Overview

```mermaid
erDiagram
    organizations ||--o{ members : "has"
    organizations ||--o{ collections : "has"
    organizations ||--o{ documents : "has"
    organizations ||--o{ conversations : "has"
    organizations ||--o{ agents : "has"
    organizations ||--o{ audit_logs : "has"
    organizations ||--o{ usage_events : "has"
    organizations ||--|| security_policies : "has one"

    members ||--o{ sessions : "has"
    members ||--o{ messages : "sends"
    members ||--o{ agent_runs : "triggers"

    documents ||--o{ chunks : "split into"
    collections ||--o{ documents : "groups"

    conversations ||--o{ messages : "contains"

    agents ||--o{ agent_runs : "executed as"
    agent_runs ||--o{ agent_run_steps : "has"
    agent_run_steps ||--o| approval_requests : "may require"
```

### Key Tables

| Table | Purpose | Notable Columns |
|---|---|---|
| `organizations` | Tenant root | `slug` (unique), `is_active` |
| `members` | Users | `role`, `password_hash` (scrypt), `organization_id` |
| `sessions` | Refresh tokens | `refresh_token_hash` (SHA-256), `is_revoked`, `expires_at` |
| `documents` | File metadata | `status`, `security_status` (`SAFE`/`SUSPICIOUS`), `access_roles` (array) |
| `chunks` | Document text pieces | `embedding` (pgvector `vector(1536)`), nullable for quarantine |
| `conversations` | Chat threads | Scoped to `member_id` + `organization_id` |
| `messages` | Chat turns | `role`, `citations` (JSONB), `restricted`, `pii_masked` |
| `agents` | AI agent definitions | `allowed_tools` (array), `require_approval`, `system_prompt` |
| `agent_runs` | Execution records | `status` (`RUNNING`/`COMPLETED`/`AWAITING_APPROVAL`/`FAILED`) |
| `approval_requests` | Human gates | `risk_level`, `status` (`PENDING`/`APPROVED`/`REJECTED`) |
| `audit_logs` | Immutable event log | `action`, `severity`, `details` (JSONB), `actor_label` |
| `security_policies` | Per-org settings | `pii_masking_enabled`, `prompt_injection_detection_enabled`, `require_agent_approval` |

### Migration

Migrations are managed with Alembic. The initial schema is in [`alembic/versions/0001_initial_schema.py`](sentinelai-backend/sentinelai-backend/alembic/versions/0001_initial_schema.py).

```bash
# Apply all pending migrations
alembic upgrade head

# Check current migration state
alembic current

# Roll back one migration
alembic downgrade -1
```

---

## 10. API Reference

All routes are under `/api/v1`. Authentication is `Authorization: Bearer <access_token>`.

All error responses follow the shape:
```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Human-readable message" },
  "request_id": "uuid"
}
```

### Authentication (`/auth`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | — | Register new organization + owner account |
| `POST` | `/auth/login` | No | — | Login; returns access + refresh tokens |
| `POST` | `/auth/refresh` | No | — | Rotate refresh token; returns new token pair |
| `POST` | `/auth/logout` | No | — | Revoke refresh token |
| `POST` | `/auth/forgot-password` | No | — | Request password reset (always 202, no email enumeration) |
| `POST` | `/auth/reset-password` | No | — | Reset password using single-use token |
| `GET` | `/auth/me` | Bearer | Any | Get current member profile |

**Register example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organization_name": "Acme Corp",
    "full_name": "Jane Smith",
    "email": "jane@acme.com",
    "password": "SecurePass123!"
  }'
```

**Login example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@acme.com", "password": "SecurePass123!"}'
```

### Documents (`/documents`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `POST` | `/documents` | Bearer | `documents.write` | Upload a document (multipart/form-data) |
| `GET` | `/documents` | Bearer | `documents.read` | List all documents (filter by `collection_id`) |
| `GET` | `/documents/{id}` | Bearer | `documents.read` | Get document metadata |
| `PATCH` | `/documents/{id}` | Bearer | `documents.write` | Update collection or access_roles |
| `DELETE` | `/documents/{id}` | Bearer | `documents.delete` | Delete document + stored file |
| `POST` | `/documents/collections` | Bearer | `collections.manage` | Create a collection |
| `GET` | `/documents/collections/all` | Bearer | `documents.read` | List all collections |

**Upload example:**
```bash
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@employee-handbook.pdf"
```

### Chat (`/chat`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `POST` | `/chat/messages` | Bearer | `chat.use` | Send a message; returns assistant response with citations |
| `GET` | `/chat/conversations` | Bearer | `chat.use` | List this member's conversations |
| `GET` | `/chat/conversations/{id}/messages` | Bearer | `chat.use` | Get all messages in a conversation |

**Send message example:**
```bash
curl -X POST http://localhost:8000/api/v1/chat/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "How do I submit a travel expense report?", "conversation_id": null}'
```

### Agents (`/agents`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `POST` | `/agents` | Bearer | `agents.manage` | Create an agent |
| `GET` | `/agents` | Bearer | `agents.manage` | List agents |
| `POST` | `/agents/runs` | Bearer | `agents.manage` | Run an agent |
| `GET` | `/agents/approvals/pending` | Bearer | `agents.approve` | List pending approval requests |
| `POST` | `/agents/approvals/{id}/decide` | Bearer | `agents.approve` | Approve or reject a pending tool call |

### Organizations (`/organizations`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/organizations/members` | Bearer | `org.manage` | List all org members |
| `POST` | `/organizations/members` | Bearer | `members.manage` | Invite a new member |
| `PATCH` | `/organizations/members/{id}` | Bearer | `members.manage` | Update member role or status |

### Security (`/security`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/security/policies` | Bearer | `security.view` | Get org security policy |
| `PATCH` | `/security/policies` | Bearer | `security.manage` | Update security policy settings |

### Audit (`/audit`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/audit/logs` | Bearer | `audit.view` | Query audit log (filterable by action, severity, date range) |

> **Design note:** No `POST`, `PATCH`, or `DELETE` route for audit logs exists anywhere in the codebase — the log is append-only by omission.

### Analytics (`/analytics`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/analytics/overview` | Bearer | `analytics.view` | Document counts, chat stats, token usage |

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Returns `{"status": "ok"}` |

---

## 11. User Roles & Permissions

Permissions follow the `<resource>.<action>` pattern and are checked at the router dependency layer.

| Permission | `super_admin` | `org_owner` | `security_admin` | `knowledge_manager` | `manager` | `member` | `auditor` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `org.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `members.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `documents.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `documents.write` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `documents.delete` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `collections.manage` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `chat.use` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `agents.manage` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `agents.approve` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `security.view` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `security.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `audit.view` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `analytics.view` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

**Document-level access control** adds a second layer: each document can have an optional `access_roles` list. An empty/null list means "all org members". `super_admin` and `org_owner` always bypass document-level access controls.

---

## 12. Security Architecture

### Password Hashing

Uses `hashlib.scrypt` (Python stdlib) rather than passlib+bcrypt. This avoids a real compatibility issue where bcrypt 4.x dropped an attribute older passlib releases probe for at import time.

### JWT Strategy

- **Access tokens**: short-lived (default 30 min), contains `sub` (member_id), `org`, `role`
- **Refresh tokens**: long-lived (default 14 days), opaque JWT with `type: refresh`
- **Rotation**: every `/auth/refresh` call revokes the old token and issues a new one
- **Theft detection**: presenting a revoked refresh token revokes all sessions for that member

### Password Reset Tokens

- Single-use, no separate token table
- Token carries a fingerprint of the current password hash
- The moment the password changes, the fingerprint no longer matches — the token self-destructs without any explicit deletion

### Rate Limiting

Fixed-window rate limiter (`app/middleware/rate_limit.py`) uses Redis `INCR + EXPIRE` keyed by client IP. If Redis is unavailable, requests pass through (fail-open to avoid Redis outage taking down the API).

### CORS

Configured by `CORS_ORIGINS` env var. Defaults to `["http://localhost:3000"]`. Update for production.

### Request Tracing

Every request receives a `X-Request-ID` header (UUID). Error responses include the `request_id` to correlate logs with client errors.

### Storage Path Traversal Guard

`app/services/storage.py` validates that all storage paths resolve inside `STORAGE_DIR`. A path like `../../etc/passwd` will raise an error before any read/write attempt.

### Audit Trail

The audit log is append-only by architecture — no delete or update route exists. Every significant event (login, document upload, quarantine, policy change, agent run, approval decision) is recorded with `actor_label`, `action`, `severity`, and a structured `details` JSONB payload.

---

## 13. AI Pipeline Deep Dive

### Zero-Config Embeddings (`HashEmbeddingProvider`)

The default embedding provider requires no API key:

1. Tokenizes text into words
2. Adds character 4-grams (at 0.35x weight) for near-misspelling and word-stem overlap
3. Each token/ngram hashes to a random bucket in a 1536-dimensional vector with a pseudo-random sign
4. Vector is L2 normalized

Accuracy on the seeded 12-document demo corpus: **7/7 top-1** retrieval accuracy (hash embeddings + lexical reranker combined).

Swap to OpenAI embeddings for production: set `EMBEDDING_PROVIDER=openai` and `OPENAI_API_KEY`. No other code changes are required.

### Lexical Reranker (`LexicalReranker`)

Compensates for hash embedding limitations by blending in IDF-weighted term coverage:

- Computes IDF scores across the candidate pool
- Scores each candidate by coverage of query terms, weighted by IDF
- Blends vector score and lexical score (configurable alpha, defaulting to equal weight)
- Final ranking by blended score

### Safe Calculator Tool

The `calculator` agent tool uses an AST-walk evaluator, not `eval()`. It parses the expression into an AST and only evaluates whitelisted node types (`BinOp`, `UnaryOp`, `Constant`). Any identifier, function call, or attribute access raises `UnsafeExpressionError`.

---

## 14. Agent System

### Architecture

```mermaid
flowchart LR
    User --> POST_runs["POST /agents/runs"]
    POST_runs --> AgentService["agent_service.run_agent()"]
    AgentService --> CheckApproval{"requires_approval()\nrisk_level × require_approval flag"}
    CheckApproval -->|low-risk or no approval| Execute["execute_tool()"]
    CheckApproval -->|approval required| Pause["Create ApprovalRequest\nstatus=PENDING\nRun status=AWAITING_APPROVAL"]
    Pause --> Reviewer["Reviewer: POST /agents/approvals/{id}/decide"]
    Reviewer --> Execute
    Execute --> Result["AgentRun.status=COMPLETED\nfinal_output set"]
```

### Approval Logic

```
risk_level = low   → always auto-approve
risk_level = high  → always require human sign-off
risk_level = medium → defer to agent.require_approval flag
```

### Tool Registry

| Tool | Risk | Implementation |
|---|---|---|
| `calculator` | `low` | AST-safe arithmetic evaluator |
| `knowledge_search` | `low` | Full RAG pipeline (permission-filtered) |
| `crm_lookup` | `medium` | **Simulated stub** — wire to real CRM |
| `http_api` | `high` | **Simulated stub** — wire to real HTTP integration |

---

## 15. Development Commands

### Backend

```bash
# Activate virtual environment (Windows)
.venv\Scripts\activate

# Activate virtual environment (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start API server (development, with hot reload)
uvicorn app.main:app --reload --port 8000

# Start Celery worker (if PROCESS_DOCUMENTS_INLINE=false)
celery -A app.workers.tasks worker --loglevel=info

# Seed demo data
python -m scripts.seed

# Lint
ruff check .

# Fix auto-fixable lint issues
ruff check . --fix

# Run tests
pytest

# Run tests with verbose output
pytest -v

# Run only pure-Python tests (no DB needed)
pytest tests/test_security_detectors.py

# Check migrations are in sync with models
alembic check
```

### Docker

```bash
# Build and start all services
docker compose up --build

# Start in background
docker compose up -d

# View API logs
docker compose logs -f api

# Run migrations inside container
docker compose exec api alembic upgrade head

# Seed demo data inside container
docker compose exec api python -m scripts.seed

# Run tests inside container
docker compose exec api pytest

# Stop all services
docker compose down

# Stop and remove volumes (destroys database)
docker compose down -v
```

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

---

## 16. Testing

### Test Structure

| Test File | Type | Database Required? |
|---|---|---|
| `tests/test_security_detectors.py` | Unit — PII regex, Luhn validator, injection scanner | ❌ No |
| `tests/test_auth.py` | Integration — register, login, refresh, reuse detection | ✅ Yes (PostgreSQL + pgvector) |
| `tests/test_rbac_and_tenancy.py` | Integration — RBAC checks, cross-tenant isolation | ✅ Yes |

### Running Tests

```bash
# Pure unit tests (no database)
pytest tests/test_security_detectors.py

# All tests (requires live PostgreSQL)
pytest

# With test database URL override
TEST_DATABASE_URL=postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinelai_test pytest

# Verbose
pytest -v --tb=short
```

### What Has Been Verified

The following was directly executed and confirmed correct in the original build environment:

- ✅ Password hashing round-trips (scrypt)
- ✅ JWT tamper rejection
- ✅ Refresh token uniqueness
- ✅ PII regex edge cases (trailing punctuation, overlapping matches, Luhn false positives)
- ✅ Prompt injection pattern matching
- ✅ Safe calculator AST evaluation vs. unsafe expression rejection
- ✅ Path-traversal guard
- ✅ End-to-end ingestion pipeline (PDF/DOCX extraction → chunking → embedding → injection scan)
- ✅ Retrieval quality: 7/7 top-1 accuracy on 12-document seeded corpus

The FastAPI router and SQLAlchemy async query code passed `python -m py_compile` (syntax-valid) but **has not been run against a live database** by the original author. The most likely class of bug, if any exists, is a signature mismatch in the service layer functions.

---

## 17. Deployment

### Docker Compose (Production)

The included `docker-compose.yml` is a production-capable setup:

1. Set strong secrets in `.env`:
   ```env
   APP_SECRET=<64-char random string>
   JWT_SECRET=<64-char random string>
   DATABASE_URL=postgresql+asyncpg://sentinel:<strong-password>@postgres:5432/sentinelai
   ```

2. Add a reverse proxy (nginx, Caddy, Traefik) in front of the `api` container for TLS termination

3. Mount persistent volumes for `sentinelai_pgdata` and `sentinelai_storage` to durable storage

4. Set `CORS_ORIGINS` to your production frontend domain

### Environment-Specific Configuration

```env
APP_ENV=production         # switches logging to INFO level
PROCESS_DOCUMENTS_INLINE=false  # use Celery worker in production
LLM_PROVIDER=anthropic     # or openai
EMBEDDING_PROVIDER=openai  # recommended for production retrieval quality
```

### Frontend (Next.js)

```bash
npm run build
npm start
# or deploy to Vercel, Netlify, or any Node.js host
```

Set `NEXT_PUBLIC_API_BASE_URL` to your production backend URL.

### Health Check

The API exposes `GET /health` → `{"status": "ok"}`. Use this for load balancer and container health checks.

---

## 18. Troubleshooting

### Backend won't start — "relation does not exist"

**Cause:** Migrations haven't been run.

```bash
alembic upgrade head
# or in Docker:
docker compose exec api alembic upgrade head
```

### `CREATE EXTENSION vector` fails

**Cause:** `pgvector` extension isn't installed in your PostgreSQL instance.

Use the Docker image: `ankane/pgvector:v0.5.1` (already in `docker-compose.yml`).

For bare-metal: install `postgresql-15-pgvector` (Ubuntu) or build from source.

### Rate limit 429 with no Redis

**Cause:** Redis isn't running. The rate limiter fails-open (passes requests through), but it logs an error. Start Redis or set `REDIS_URL` correctly.

### Document stuck in `PROCESSING` / never becomes `READY`

**Cause A:** `PROCESS_DOCUMENTS_INLINE=false` but no Celery worker is running.

```bash
celery -A app.workers.tasks worker --loglevel=info
# or set PROCESS_DOCUMENTS_INLINE=true for local dev
```

**Cause B:** The document is `SUSPICIOUS` — check its `security_status` in `GET /documents/{id}`. It was quarantined by the injection scanner. This is expected behavior for the seeded vendor contract.

### Frontend shows "fetch failed" errors

**Cause:** API is not running, or CORS isn't configured.

1. Confirm `http://localhost:8000/health` returns `{"status": "ok"}`
2. Confirm `CORS_ORIGINS` in `.env` includes `http://localhost:3000`

### `alembic check` fails after model change

**Cause:** You modified an ORM model but didn't generate a new migration.

```bash
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

### JWT decode error on refresh

**Cause:** `JWT_SECRET` changed between the access token being issued and the refresh attempt. Tokens issued with a different secret are invalid.

In development: restart the server after changing `JWT_SECRET`.

### FAQ

**Q: Can I run without Redis?**
A: Yes, for local development. The rate limiter fails-open when Redis is unreachable. Set `PROCESS_DOCUMENTS_INLINE=true` to avoid needing Celery (which also uses Redis).

**Q: Can I use Ollama instead of OpenAI/Anthropic?**
A: Set `LLM_PROVIDER=ollama` and `OLLAMA_BASE_URL=http://localhost:11434` with your model in `OLLAMA_MODEL`. Note: Ollama doesn't provide an embeddings endpoint compatible with the current `OpenAIEmbeddingProvider` — use `EMBEDDING_PROVIDER=hash` with Ollama.

**Q: How do I add a new role?**
A: Add the role to the `Role` enum and `ROLE_PERMISSIONS` dict in [`app/policies/rbac.py`](sentinelai-backend/sentinelai-backend/app/policies/rbac.py). No database migration is needed.

**Q: The seeded vendor contract is `SUSPICIOUS` — is that a bug?**
A: No. That's the injection scanner working correctly. The seed script inserts a sentence containing a known injection pattern into that document's content. The scanner finds it, marks the document `SUSPICIOUS`, and skips embedding. This demonstrates the quarantine mechanism.

---

## 19. Known Limitations & Roadmap

### Current Limitations (Backend)

- The FastAPI/SQLAlchemy router and query code has **not been run against a live database** by the original author. Pure-Python modules (security, RBAC, AI modules) were directly verified. Integration tests should be run before production use.
- The `crm_lookup` and `http_api` agent tools are **simulated stubs** — they return fake data and don't make real external calls.
- Ollama embedding integration is not implemented (`OpenAIEmbeddingProvider` uses the OpenAI SDK).
- No email delivery is wired up for password reset — the reset token is returned in the API response for demo purposes.
- Rate limiting requires Redis; there's no in-process fallback counter.

### Current Limitations (Frontend)

- The Next.js frontend runs on **mock data** and doesn't call the real backend API yet.
- Wiring the frontend to the real API is the primary next step.

### Short-Term (Next)

- [ ] Wire frontend to real backend API (replace mock data in `lib/` with real fetch calls)
- [ ] Email delivery for password reset (SMTP or transactional email provider)
- [ ] Real CRM and HTTP integrations for agent tools
- [ ] Ollama embedding support
- [ ] More comprehensive integration test suite

### Medium-Term

- [ ] SSO / SAML / OIDC integration
- [ ] Webhook notifications for agent approval requests
- [ ] Per-document chunk-level access control (finer than document-level `access_roles`)
- [ ] Streaming LLM responses (Server-Sent Events)
- [ ] Model-based prompt injection classifier (complement the regex heuristic)
- [ ] Document versioning and re-ingestion

### Long-Term

- [ ] Per-tenant custom roles (migrate from static code to DB-backed permissions)
- [ ] Multi-region PostgreSQL for global deployment
- [ ] OpenTelemetry tracing integration
- [ ] Advanced analytics (per-user query patterns, retrieval quality metrics)

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow the existing code style (Ruff for linting: `ruff check .`)
4. Add or update tests for any logic changes
5. Ensure `pytest tests/test_security_detectors.py` passes (no database required)
6. Update this README if you add or change significant functionality
7. Submit a pull request with a clear description of the change and its motivation

For bug reports, please include:
- Python/Node.js versions
- Database version and pgvector version
- The full error message and stack trace
- Steps to reproduce

---

## License

*To be confirmed — no `LICENSE` file was found in the repository at time of writing.*

---

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) — the async Python API framework
- [pgvector](https://github.com/pgvector/pgvector) — open-source vector similarity search for PostgreSQL
- [SQLAlchemy](https://www.sqlalchemy.org/) — the Python SQL toolkit and ORM
- [Pydantic](https://docs.pydantic.dev/) — data validation using Python type annotations
- [Next.js](https://nextjs.org/) — the React framework for production
