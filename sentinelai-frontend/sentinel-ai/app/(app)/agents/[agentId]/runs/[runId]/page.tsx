"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Timeline } from "@/components/agents/timeline";
import { ToolBadgeRow } from "@/components/agents/agent-components";
import { getRun } from "@/lib/mock/agents";

const runStatusTone = {
  completed: "safe",
  awaiting_approval: "warn",
  failed: "critical",
  running: "signal",
} as const;

export default function AgentRunDetailPage({ params }: { params: { agentId: string; runId: string } }) {
  const { agent, run } = getRun(params.agentId, params.runId);

  if (!agent || !run) {
    return (
      <div className="p-6 md:p-8">
        <BackLink />
        <EmptyState title="Run not found" description="This run isn't in the seed dataset for this demo." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-paper">{run.title}</h1>
          <p className="mt-1 text-sm text-mute">{agent.name}</p>
        </div>
        <Badge tone={runStatusTone[run.status]}>{run.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Execution timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline steps={run.steps} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-2 text-xs text-faint">Allowed tools</p>
              <ToolBadgeRow tools={agent.tools} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-faint">Started</dt>
                <dd className="mt-0.5 font-mono text-paper">{run.startedAt}</dd>
              </div>
              <div>
                <dt className="text-faint">Finished</dt>
                <dd className="mt-0.5 font-mono text-paper">{run.finishedAt ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-faint">Max steps</dt>
                <dd className="mt-0.5 text-paper">{agent.maxSteps}</dd>
              </div>
              <div>
                <dt className="text-faint">Timeout</dt>
                <dd className="mt-0.5 text-paper">{agent.timeoutSec}s</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-paper">
      <ArrowLeft className="h-4 w-4" />
      Back to Agents
    </Link>
  );
}
