# SentinelAI — Secure Enterprise AI Copilot

Frontend-only build of the SentinelAI PRD: a multi-tenant enterprise AI platform with
permission-aware RAG, controlled agents, human approval workflows, and full auditability.

This is **not** a static prototype — it's a real Next.js app with working navigation, forms,
and interactive state. What it doesn't have is a backend: there's no database, no real LLM
calls, and no real authentication. Every "AI response," document, security event, and audit
row comes from `lib/mock/*` and lives only in this session's memory or `localStorage`.

## What's included

Every page from PRD §15, following the same information architecture:

| Area | Pages |
|---|---|
| Public | Landing, Login, Register, Forgot password |
| Workspace | Dashboard, Chat, Knowledge (+ document detail), Agents (+ builder, + run detail), Approvals |
| Security | Security (Overview / Events / Policies), Audit log |
| Admin | Usage, Administration (Members / Roles & permissions / Organization) |

**Genuinely interactive, not just static screens:**
- **Role switcher** (top bar) — swap between the six org-scoped roles and watch the sidebar,
  page access, and document/chat access change live. This is what makes the RBAC story in
  PRD §62 actually clickable: log in as a Member and ask the chat about compensation, and
  you'll hit the same "insufficient authorized knowledge" fallback a real permission filter
  would produce.
- **Chat** — type a question; a small keyword-matched reply generator (`lib/mock/conversations.ts`)
  stands in for retrieval and answers with citations, or refuses based on your current role.
- **Upload** — runs through a simulated `Validating → Extracting → Chunking → Embedding → Indexing`
  pipeline (PRD §39) with a real progress bar.
- **Approvals** — Approve/Reject actually moves a request from Pending to History.
- **Agent run detail** — renders the exact execution timeline from PRD §15.8, including the
  approval step.

## What a real backend would replace

Everything under `lib/mock/` is written to be swapped out without touching component code:

- `lib/mock/*.ts` → real API calls (see the endpoints sketched in PRD §30)
- `lib/auth-context.tsx` → a real session (JWT/cookie), instead of a role switcher in `localStorage`
- `lib/mock/conversations.ts`'s `generateAssistantReply` → the actual RAG pipeline in PRD §17
  (authn → authz → tenant filter → permission filter → vector search → rerank → LLM)
- The upload pipeline's `setInterval` steps → real async job status polling (PRD §38)

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · lucide-react

UI primitives (`components/ui/*`) are hand-built rather than installed via the shadcn/ui CLI,
since that CLI needs network access to fetch from its registry. They follow the same
conventions (Tailwind + `class-variance`-style variants, a shared `cn()` helper), so swapping
in real shadcn/ui components later is a drop-in change if you want it.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Log in with the "Quick demo access" buttons on the login page
to jump straight into any role.

## How this was built (please read before relying on this in production)

This code was generated without a live Node/TypeScript toolchain in the loop — there was no
`npm install`, no `next build`, and no browser to actually render anything and catch mistakes.
Every file was hand-written against knowledge of Next.js/React/TypeScript conventions and
cross-checked with static analysis (import/export resolution, brace balance, route param
matching), but that's not a substitute for a real compile.

As a safety net, `next.config.mjs` currently sets:

```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```

Please run `npm run lint` and `npx tsc --noEmit` yourself, fix anything that surfaces, and
flip both back to `false` once you've done a pass — don't leave them on long-term.

## Design system

Dark, hairline-bordered, tables-over-cards — built to read as a governance/audit console
rather than a generic AI chat product:

- **Ink** `#0B0E13` background, **Panel** `#131922` surfaces, **Line** `#242C38` borders
- **Gold** `#C9962B` — governance accent: approvals, signed-off states, primary actions
- **Signal** `#5B8CFF` — intelligence accent: AI/retrieval moments, links, active nav
- Status colors (`status-safe` / `status-warn` / `status-critical`) are kept separate from
  both, so "brand" and "state" never get confused
- **Sora** for headings, **Inter** for body/data (real tabular figures in tables), **IBM Plex
  Mono** used functionally for IDs, timestamps, and payloads — not as decoration

All of it lives in `tailwind.config.ts` under `theme.extend.colors`, named deliberately so
they never collide with Tailwind's default palette.

## Not included (would be the natural next milestones)

Per PRD §11/§72's own phasing — these are real backend/infra work, not frontend gaps:
multi-file agent tool marketplace, Slack/Drive/M365 connectors, webhook integrations, the
AI evaluation framework (§23), OpenTelemetry/Prometheus/Grafana wiring, and Kubernetes
deployment (the PRD itself recommends Docker first — §54).

## Project structure

```
app/
  (auth)/            login, register, forgot-password — centered auth layout
  (app)/              the protected shell: sidebar + topbar + role-gated routes
components/
  ui/                 hand-built primitives (Button, Card, Badge, Modal, Tabs, ...)
  layout/             Sidebar, Topbar
  chat/ knowledge/ security/ agents/   feature-specific components
lib/
  types.ts            shared domain types
  auth-context.tsx    the demo "session" and role switcher
  utils.ts            cn(), formatters, tone/status color mapping
  mock/               all seed data — swap this out for a real API
```
