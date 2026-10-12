import type { ChatMessage, Citation, Confidence, Conversation, Role } from "@/lib/types";

// Exact fallback copy from PRD §48 — shown whenever retrieval can't
// authorize an answer, instead of letting the model guess.
export const INSUFFICIENT_KNOWLEDGE_REPLY =
  "I couldn't find sufficient information in your organization's authorized knowledge sources to answer this confidently.";

const RESTRICTED_ROLES_FOR_COMP: Role[] = ["org_owner", "security_admin", "manager"];

interface GeneratedReply {
  content: string;
  citations?: Citation[];
  confidence?: Confidence;
  restricted?: boolean;
}

/**
 * Stands in for permission-aware retrieval (PRD §17). Real implementation
 * would run: authz → tenant filter → permission filter → vector search →
 * rerank → LLM. Here we pattern-match, then apply the same allow/deny
 * decision a permission filter would make.
 */
export function generateAssistantReply(question: string, role: Role): GeneratedReply {
  const q = question.toLowerCase();

  if (/(salary|compensation|bonus|pay\b|payroll)/.test(q)) {
    if (RESTRICTED_ROLES_FOR_COMP.includes(role)) {
      return {
        content:
          "Base salary bands are reviewed annually and published in the Compensation & Benefits Guide. Bonus eligibility starts after 6 months of tenure and is calculated against the band midpoint; the guide includes the full table by level.",
        citations: [
          { documentId: "doc-003", documentName: "Compensation & Benefits Guide.pdf", page: 8, snippet: "Annual bands are reviewed each March..." },
        ],
        confidence: "high",
      };
    }
    return {
      content: INSUFFICIENT_KNOWLEDGE_REPLY,
      restricted: true,
    };
  }

  if (/(leave|pto|vacation|time off|sick day)/.test(q)) {
    return {
      content:
        "According to the Employee Handbook, full-time employees accrue 1.5 days of paid leave per month, capped at 18 days per year with up to 5 days carried into the next cycle. The Leave & PTO Policy adds that requests should go through the HR portal at least 5 business days in advance.",
      citations: [
        { documentId: "doc-001", documentName: "Employee Handbook.pdf", page: 12, snippet: "Full-time employees accrue 1.5 days per month..." },
        { documentId: "doc-002", documentName: "Leave & PTO Policy.pdf", page: 4, snippet: "Requests must be submitted 5 business days in advance..." },
      ],
      confidence: "high",
    };
  }

  if (/(breach|incident|compromise|leak|attack)/.test(q)) {
    return {
      content:
        "The Incident Response Plan calls for containing the affected system first and preserving logs before remediation. You're required to notify the Security Administrator within 1 hour of detection, and the Security Policy requires a written summary within 24 hours.",
      citations: [
        { documentId: "doc-005", documentName: "Incident Response Plan.pdf", page: 6, snippet: "Contain, preserve, notify within one hour..." },
        { documentId: "doc-004", documentName: "Security Policy.pdf", page: 19, snippet: "A written summary is required within 24 hours..." },
      ],
      confidence: "high",
    };
  }

  if (/(onboard|new client|kickoff)/.test(q)) {
    return {
      content:
        "The Client Onboarding Playbook outlines a 4-step kickoff: intake call within 2 business days, workspace provisioning, a scoped success plan signed by both parties, and a 30-day check-in scheduled at signature time.",
      citations: [
        { documentId: "doc-008", documentName: "Client Onboarding Playbook.pdf", page: 3, snippet: "Kickoff calls are scheduled within two business days..." },
      ],
      confidence: "medium",
    };
  }

  return {
    content:
      "I can answer questions grounded in your organization's connected knowledge base — try asking about leave policy, incident response, or client onboarding.",
    confidence: "low",
  };
}

export const conversations: Conversation[] = [
  {
    id: "conv-001",
    title: "Employee leave policy",
    assistant: "HR Assistant",
    updatedAt: "10:41 AM",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "What is our employee leave policy?",
        timestamp: "10:40 AM",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "According to the Employee Handbook, full-time employees accrue 1.5 days of paid leave per month, capped at 18 days per year with up to 5 days carried into the next cycle. The Leave & PTO Policy adds that requests should go through the HR portal at least 5 business days in advance.",
        citations: [
          { documentId: "doc-001", documentName: "Employee Handbook.pdf", page: 12, snippet: "Full-time employees accrue 1.5 days per month..." },
          { documentId: "doc-002", documentName: "Leave & PTO Policy.pdf", page: 4, snippet: "Requests must be submitted 5 business days in advance..." },
        ],
        confidence: "high",
        timestamp: "10:41 AM",
      },
    ],
  },
  {
    id: "conv-002",
    title: "Incident response steps",
    assistant: "Security Assistant",
    updatedAt: "Yesterday",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "What are the first steps if we suspect a data breach?",
        timestamp: "Yesterday, 4:02 PM",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "The Incident Response Plan calls for containing the affected system first and preserving logs before remediation. You're required to notify the Security Administrator within 1 hour of detection, and the Security Policy requires a written summary within 24 hours.",
        citations: [
          { documentId: "doc-005", documentName: "Incident Response Plan.pdf", page: 6, snippet: "Contain, preserve, notify within one hour..." },
          { documentId: "doc-004", documentName: "Security Policy.pdf", page: 19, snippet: "A written summary is required within 24 hours..." },
        ],
        confidence: "high",
        timestamp: "Yesterday, 4:03 PM",
      },
    ],
  },
  {
    id: "conv-003",
    title: "Client onboarding process",
    assistant: "Operations Assistant",
    updatedAt: "3 days ago",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Walk me through how we kick off a new client.",
        timestamp: "Mon, 9:14 AM",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "The Client Onboarding Playbook outlines a 4-step kickoff: intake call within 2 business days, workspace provisioning, a scoped success plan signed by both parties, and a 30-day check-in scheduled at signature time.",
        citations: [
          { documentId: "doc-008", documentName: "Client Onboarding Playbook.pdf", page: 3, snippet: "Kickoff calls are scheduled within two business days..." },
        ],
        confidence: "medium",
        timestamp: "Mon, 9:15 AM",
      },
    ],
  },
];

export function nextMessageId(): string {
  return `m-${Math.random().toString(36).slice(2, 9)}`;
}
