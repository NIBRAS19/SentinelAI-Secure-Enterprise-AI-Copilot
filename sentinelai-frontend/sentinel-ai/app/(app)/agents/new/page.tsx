"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label, Input, Textarea, Select, Checkbox } from "@/components/ui/form-elements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_TOOLS } from "@/lib/types";
import { riskTone } from "@/lib/utils";

export default function NewAgentPage() {
  const [name, setName] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>(["knowledge_search"]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [restrictNetwork, setRestrictNetwork] = useState(true);
  const [allowSensitive, setAllowSensitive] = useState(false);
  const [maxSteps, setMaxSteps] = useState(10);
  const [timeoutSec, setTimeoutSec] = useState(60);
  const [created, setCreated] = useState(false);

  function toggleTool(id: string) {
    setSelectedTools((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  if (created) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex flex-col items-center justify-center rounded-md border border-line bg-panel px-6 py-16 text-center">
          <CheckCircle2 className="mb-4 h-8 w-8 text-status-safe" />
          <p className="font-display text-lg font-semibold text-paper">{name || "Your agent"} was created</p>
          <p className="mt-1.5 max-w-sm text-sm text-mute">
            It&apos;s ready to test with the tool policy you configured. This demo doesn&apos;t persist new agents
            across a refresh — the three seeded agents show what a live one looks like.
          </p>
          <Link href="/agents" className="mt-6">
            <Button variant="secondary">Back to Agents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <Link href="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-paper">
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>
      <PageHeader
        title="New agent"
        description="Configure what this agent knows, what it can touch, and when a human has to sign off."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCreated(true);
        }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent-name">Agent name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Renewals Agent"
                  required
                />
              </div>
              <div>
                <Label htmlFor="agent-desc">Description</Label>
                <Textarea id="agent-desc" rows={2} placeholder="What is this agent responsible for?" />
              </div>
              <div>
                <Label htmlFor="agent-model">Model</Label>
                <Select id="agent-model" defaultValue="Claude Sonnet 5">
                  <option>Claude Sonnet 5</option>
                  <option>Claude Haiku 4.5</option>
                  <option>GPT-4o</option>
                  <option>Llama 3.1 70B (self-hosted)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="agent-instructions">Instructions</Label>
                <Textarea id="agent-instructions" rows={4} placeholder="System instructions for this agent..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tools</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-line">
              {AVAILABLE_TOOLS.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between py-1">
                  <Checkbox
                    checked={selectedTools.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    label={tool.name}
                    hint={tool.requiresApproval ? "Requires approval before executing" : "Executes automatically"}
                  />
                  <Badge tone={riskTone(tool.risk)}>{tool.risk} risk</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security policy</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-line">
              <Checkbox
                checked={requireApproval}
                onChange={setRequireApproval}
                label="Require approval"
                hint="For any tool marked high or medium risk"
              />
              <Checkbox
                checked={restrictNetwork}
                onChange={setRestrictNetwork}
                label="Restrict external network"
                hint="Blocks calls outside approved tool endpoints"
              />
              <Checkbox
                checked={allowSensitive}
                onChange={setAllowSensitive}
                label="Allow sensitive data"
                hint="Lets this agent read restricted documents"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max-steps">Max steps</Label>
                <Input
                  id="max-steps"
                  type="number"
                  min={1}
                  max={30}
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={5}
                  max={300}
                  value={timeoutSec}
                  onChange={(e) => setTimeoutSec(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Create agent
          </Button>
        </div>
      </form>
    </div>
  );
}
