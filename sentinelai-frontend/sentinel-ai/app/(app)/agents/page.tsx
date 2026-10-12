"use client";

import Link from "next/link";
import { Plus, Bot } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolBadgeRow } from "@/components/agents/agent-components";
import { agents } from "@/lib/mock/agents";

const runStatusTone = {
  completed: "safe",
  awaiting_approval: "warn",
  failed: "critical",
  running: "signal",
} as const;

export default function AgentsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Agents"
        description="Configured agents and the tool policies that constrain what they're allowed to do."
        actions={
          <Link href="/agents/new">
            <Button>
              <Plus className="h-4 w-4" />
              New agent
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-signal" />
                <CardTitle>{agent.name}</CardTitle>
              </div>
              <Badge tone={agent.requireApproval ? "warn" : "safe"}>
                {agent.requireApproval ? "Approval required" : "Auto-executes"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-mute">{agent.description}</p>
              <ToolBadgeRow tools={agent.tools} />
              <div>
                <p className="mb-2 text-xs text-faint">Recent runs</p>
                <div className="space-y-1.5">
                  {agent.runs.map((run) => (
                    <Link
                      key={run.id}
                      href={`/agents/${agent.id}/runs/${run.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 hover:bg-panel-raised"
                    >
                      <span className="text-sm text-paper">{run.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-faint">{run.startedAt}</span>
                        <Badge tone={runStatusTone[run.status]}>{run.status.replace("_", " ")}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
