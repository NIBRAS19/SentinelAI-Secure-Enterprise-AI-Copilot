import { AVAILABLE_TOOLS, type Agent, type ApprovalRequest } from "@/lib/types";

const [knowledgeSearch, calculator, crmLookup, httpApi] = AVAILABLE_TOOLS;

export const agents: Agent[] = [
  {
    id: "agent-knowledge",
    name: "Knowledge Agent",
    description: "Answers internal questions by searching the knowledge base only. No write access anywhere.",
    model: "Claude Sonnet 5",
    tools: [knowledgeSearch, calculator],
    requireApproval: false,
    restrictExternalNetwork: true,
    maxSteps: 6,
    timeoutSec: 30,
    runs: [
      {
        id: "run-knowledge-1",
        agentId: "agent-knowledge",
        title: "Answered onboarding FAQ for a new hire",
        status: "completed",
        startedAt: "Yesterday, 2:14 PM",
        finishedAt: "Yesterday, 2:14 PM",
        steps: [
          { id: "s1", time: "14:14:01", label: "Started", status: "done" },
          { id: "s2", time: "14:14:02", label: "Retrieved documents", detail: "Onboarding Checklist.md, Employee Handbook.pdf", status: "done" },
          { id: "s3", time: "14:14:04", label: "Final response", status: "done" },
        ],
      },
    ],
  },
  {
    id: "agent-ticket",
    name: "Ticket Assistant",
    description: "Looks up and updates support tickets in the CRM on behalf of the Customer Success team.",
    model: "Claude Sonnet 5",
    tools: [knowledgeSearch, crmLookup],
    requireApproval: true,
    restrictExternalNetwork: true,
    maxSteps: 8,
    timeoutSec: 45,
    runs: [
      {
        id: "run-ticket-1",
        agentId: "agent-ticket",
        title: "Attempted to close ticket #88 with a destructive delete",
        status: "failed",
        startedAt: "2026-09-24, 11:36 AM",
        finishedAt: "2026-09-24, 11:37 AM",
        steps: [
          { id: "s1", time: "11:36:40", label: "Started", status: "done" },
          { id: "s2", time: "11:36:44", label: "Tool request", detail: "DELETE /crm/contacts/88", status: "done" },
          { id: "s3", time: "11:36:44", label: "Approval required", status: "done" },
          { id: "s4", time: "11:37:02", label: "Rejected by Nibras Ahmed", detail: "Destructive action outside agent's approved scope.", status: "blocked" },
        ],
      },
    ],
  },
  {
    id: "agent-custops",
    name: "Customer Operations Agent",
    description: "Turns qualified conversations into CRM leads and can reach external systems when approved.",
    model: "Claude Sonnet 5",
    tools: [knowledgeSearch, crmLookup, httpApi],
    requireApproval: true,
    restrictExternalNetwork: false,
    maxSteps: 10,
    timeoutSec: 60,
    runs: [
      {
        id: "run-custops-1",
        agentId: "agent-custops",
        title: "Created a CRM lead from a support conversation",
        status: "completed",
        startedAt: "2026-09-26, 10:42:01",
        finishedAt: "2026-09-26, 10:42:19",
        steps: [
          { id: "s1", time: "10:42:01", label: "Started", status: "done" },
          { id: "s2", time: "10:42:02", label: "Retrieved documents", detail: "Client Onboarding Playbook.pdf", status: "done" },
          { id: "s3", time: "10:42:03", label: "Generated plan", detail: "Create lead, tag as inbound, notify account owner", status: "done" },
          { id: "s4", time: "10:42:04", label: "Tool request", detail: "POST /crm/leads", status: "done" },
          { id: "s5", time: "10:42:04", label: "Approval required", detail: "CRM write actions require sign-off per security policy", status: "done" },
          { id: "s6", time: "10:42:15", label: "Approved by Nibras Ahmed", status: "done" },
          { id: "s7", time: "10:42:17", label: "Tool completed", detail: "Lead created: Acme Prospect Co.", status: "done" },
          { id: "s8", time: "10:42:19", label: "Final response", status: "done" },
        ],
      },
    ],
  },
];

export function getAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function getRun(agentId: string, runId: string) {
  const agent = getAgent(agentId);
  const run = agent?.runs.find((r) => r.id === runId);
  return { agent, run };
}

export const approvalRequests: ApprovalRequest[] = [
  {
    id: "appr-001",
    agentName: "Customer Operations Agent",
    requestedBy: "Maria Gonzalez",
    tool: "POST /crm/leads",
    payloadSummary: 'Create lead "Northwind Prospect Co." — contact: ops@northwind-prospect.example',
    riskLevel: "medium",
    reason: "New qualified lead detected in a support conversation.",
    timestamp: "Today, 11:02 AM",
    status: "pending",
  },
  {
    id: "appr-002",
    agentName: "Ticket Assistant",
    requestedBy: "James Okafor",
    tool: "POST /crm/tickets/442/close",
    payloadSummary: "Close ticket #442 as resolved, notify requester by email",
    riskLevel: "medium",
    reason: "User confirmed the issue was resolved in the chat transcript.",
    timestamp: "Today, 9:47 AM",
    status: "pending",
  },
  {
    id: "appr-003",
    agentName: "Customer Operations Agent",
    requestedBy: "Maria Gonzalez",
    tool: "POST /crm/leads",
    payloadSummary: "Create lead: Acme Prospect Co.",
    riskLevel: "medium",
    reason: "New qualified lead detected in a support conversation.",
    timestamp: "Today, 10:42 AM",
    status: "approved",
    resolvedBy: "Nibras Ahmed",
    resolvedAt: "Today, 10:42 AM",
  },
  {
    id: "appr-004",
    agentName: "Ticket Assistant",
    requestedBy: "James Okafor",
    tool: "DELETE /crm/contacts/88",
    payloadSummary: "Permanently delete contact record #88",
    riskLevel: "high",
    reason: "Requester asked to remove a duplicate contact.",
    timestamp: "2 days ago",
    status: "rejected",
    resolvedBy: "Nibras Ahmed",
    resolvedAt: "2 days ago",
  },
];
