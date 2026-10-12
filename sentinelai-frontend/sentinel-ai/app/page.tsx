import Link from "next/link";
import { ShieldCheck, ShieldAlert, FileWarning, ClipboardCheck, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const feed: { time: string; event: string; tone: "safe" | "critical" | "gold"; detail: string; meta: string }[] = [
  { time: "09:41:02", event: "AI_REQUEST", tone: "safe", detail: "assistant = HR Copilot", meta: "214ms" },
  { time: "09:41:03", event: "RETRIEVAL", tone: "safe", detail: "employee-handbook.pdf (p. 12)", meta: "authorized" },
  { time: "09:41:07", event: "PROMPT_INJECTION", tone: "critical", detail: "uploaded_document", meta: "blocked" },
  { time: "09:41:15", event: "APPROVAL_GRANTED", tone: "gold", detail: "POST /crm/leads", meta: "N. Ahmed" },
];

const toneText: Record<string, string> = {
  safe: "text-status-safe",
  critical: "text-status-critical",
  gold: "text-gold",
};

const pipeline = ["Authenticate", "Authorize", "Permission filter", "Vector search", "Rerank", "Validated response"];

const controls = [
  {
    icon: FileWarning,
    title: "Prompt-injection defense",
    body: "Every uploaded document is treated as untrusted input and scanned for instruction-override patterns before it ever reaches an assistant's context.",
  },
  {
    icon: Lock,
    title: "Permission-aware retrieval",
    body: "A vector match is never enough on its own — the same authorization check that gates an API route also gates which chunks a model is allowed to see.",
  },
  {
    icon: ClipboardCheck,
    title: "Human approval for high-risk actions",
    body: "Agents plan and request; a person with the right role signs off before anything with side effects actually runs.",
  },
  {
    icon: ShieldAlert,
    title: "An audit trail that isn't optional",
    body: "Logins, retrievals, tool calls, and approvals all write to the same append-oriented record, not a debug log someone forgot to turn on.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold" />
            <span className="font-display text-sm font-semibold text-paper">SentinelAI</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-mute sm:flex">
            <a href="#retrieval" className="hover:text-paper">
              Retrieval
            </a>
            <a href="#security" className="hover:text-paper">
              Security
            </a>
            <a href="#architecture" className="hover:text-paper">
              Architecture
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm text-mute hover:text-paper sm:block">
              Log in
            </Link>
            <Link href="/login">
              <Button size="sm">Start demo</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero: asymmetric two-column, left-aligned copy beside a live-feeling
         audit console — the most characteristic object in this product's
         world, not a decorative illustration. */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:items-center md:pt-24">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-paper md:text-5xl">
            Enterprise AI you can actually audit.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-mute">
            SentinelAI connects your company&apos;s knowledge to AI assistants and controlled agents, without giving up
            who can see what, or losing the record of what the AI did.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button>Start demo</Button>
            </Link>
            <a href="#architecture">
              <Button variant="secondary">Explore architecture</Button>
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-mono text-xs text-mute">sentinelai — audit stream</span>
            <span className="flex items-center gap-1.5 text-xs text-status-safe">
              <span className="h-1.5 w-1.5 rounded-full bg-status-safe" /> live
            </span>
          </div>
          <div className="space-y-3 p-4">
            {feed.map((row, i) => (
              <div
                key={row.time}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-xs opacity-0 animate-line-in"
                style={{ animationDelay: `${i * 220 + 150}ms`, animationFillMode: "forwards" }}
              >
                <span className="text-faint">{row.time}</span>
                <span className={`w-40 shrink-0 ${toneText[row.tone]}`}>{row.event}</span>
                <span className="flex-1 text-mute">{row.detail}</span>
                <span className={toneText[row.tone]}>{row.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three grounded claims instead of vanity metrics — this is a demo
         product, so real usage numbers would be misleading here; the
         dashboard inside the app is where actual figures belong. */}
      <section className="border-y border-line">
        <div className="mx-auto grid max-w-6xl divide-y divide-line px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            { title: "Retrieval is authorization-checked", body: "not just relevance-ranked against an embedding." },
            { title: "Agents can't act without a policy check", body: "every tool call passes risk assessment first." },
            { title: "Every decision leaves a record", body: "logins, retrievals, tool calls, approvals — all of it." },
          ].map((item) => (
            <div key={item.title} className="px-0 py-8 md:px-8">
              <p className="font-display text-base font-semibold text-paper">{item.title}</p>
              <p className="mt-1.5 text-sm text-mute">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRD §17's own line, used verbatim as the section's argument rather
         than an invented marketing headline. */}
      <section id="retrieval" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display max-w-2xl text-2xl font-semibold text-paper md:text-3xl">
          Retrieval itself is an authorization boundary.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
          A user should never receive information merely because an embedding happens to rank it highly. Every
          question runs through the same layered check a protected API route would use, before a single chunk
          reaches the model.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {pipeline.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-line bg-panel px-3 py-2 font-mono text-xs text-paper">{step}</span>
              {i < pipeline.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-faint" />}
            </div>
          ))}
        </div>
      </section>

      {/* Security controls: a disciplined row list, not four identical
         icon-in-a-circle cards. */}
      <section id="security" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display max-w-xl text-2xl font-semibold text-paper md:text-3xl">
            The model is assumed fallible. The policy engine is not.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-mute">
            The architecture never assumes an LLM will behave correctly — it can hallucinate, follow a malicious
            instruction, or pick the wrong tool. Security decisions stay with the backend policy engine, not the
            model.
          </p>
          <div className="mt-10 divide-y divide-line border-t border-line">
            {controls.map((control) => (
              <div key={control.title} className="flex gap-4 py-6">
                <control.icon className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <div>
                  <p className="font-display text-sm font-semibold text-paper">{control.title}</p>
                  <p className="mt-1 max-w-xl text-sm text-mute">{control.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture, rendered as the PRD's own diagram style rather than
         a stock isometric-cloud illustration. */}
      <section id="architecture" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-2xl font-semibold text-paper md:text-3xl">One request, nine checkpoints.</h2>
          <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-panel p-6">
            <pre className="whitespace-pre font-mono text-xs leading-loose text-mute md:text-sm">
{`Browser — Next.js, React, TypeScript
  ↓
API Gateway
  ↓
FastAPI Backend — Auth, Organizations, Documents, Chat, Agents, Security, Audit
  ↓
PostgreSQL + pgvector, Redis / Queue, S3-compatible object storage
  ↓
LLM Gateway — Anthropic, OpenAI, Ollama (provider-agnostic by design)
  ↓
Observability — structured logs, metrics, traces`}
            </pre>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-faint">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <span>SentinelAI</span>
          </div>
          <p>Portfolio build. Running on mock data — see the README for what a real backend would replace.</p>
        </div>
      </footer>
    </div>
  );
}
