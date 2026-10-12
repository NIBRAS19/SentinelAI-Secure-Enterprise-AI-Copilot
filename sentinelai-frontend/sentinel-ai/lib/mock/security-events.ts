import type { SecurityEvent } from "@/lib/types";

// Headline stats shown on the Security Overview tab (PRD §15.10 exact
// figures). The event list below is a representative recent sample —
// real totals would come from an aggregation query, not a row count.
export const threatOverview = {
  promptInjectionAttempts: 12,
  blockedRequests: 9,
  piiDetections: 4,
  unauthorizedRetrievals: 2,
  rateLimitEvents: 18,
};

export const securityEvents: SecurityEvent[] = [
  {
    id: "sec-001",
    type: "PROMPT_INJECTION_BLOCKED",
    description: "Instruction-override pattern detected in an uploaded document footer.",
    user: "Tom Becker",
    resource: "Vendor Contract Draft.docx",
    severity: "high",
    action: "blocked",
    timestamp: "Today, 9:12 AM",
  },
  {
    id: "sec-002",
    type: "UNAUTHORIZED_RETRIEVAL_ATTEMPT",
    description: "Query would have surfaced a restricted document outside the user's role.",
    user: "James Okafor",
    resource: "Compensation & Benefits Guide.pdf",
    severity: "medium",
    action: "blocked",
    timestamp: "Today, 8:47 AM",
  },
  {
    id: "sec-003",
    type: "PII_DETECTED",
    description: "An email address in a chat prompt was masked before reaching the model.",
    user: "Maria Gonzalez",
    resource: "chat message",
    severity: "low",
    action: "masked",
    timestamp: "Yesterday, 3:20 PM",
  },
  {
    id: "sec-004",
    type: "RATE_LIMIT_EXCEEDED",
    description: "AI request rate exceeded the configured per-user limit; requests throttled.",
    user: "Tom Becker",
    resource: "AI Gateway",
    severity: "informational",
    action: "allowed",
    timestamp: "Yesterday, 11:05 AM",
  },
  {
    id: "sec-005",
    type: "PROMPT_INJECTION_BLOCKED",
    description: "Hidden instruction text found in white-on-white font, second page.",
    user: "system (upload scan)",
    resource: "Marketing Copy Draft.docx",
    severity: "high",
    action: "blocked",
    timestamp: "2 days ago",
  },
  {
    id: "sec-006",
    type: "POLICY_VIOLATION",
    description: "Agent attempted an external HTTP call outside its approved tool policy.",
    user: "Customer Operations Agent",
    resource: "External HTTP Request",
    severity: "medium",
    action: "blocked",
    timestamp: "3 days ago",
  },
  {
    id: "sec-007",
    type: "PII_DETECTED",
    description: "A phone number in an uploaded transcript was redacted at ingestion.",
    user: "Aisha Bello",
    resource: "Onboarding Checklist.md",
    severity: "low",
    action: "masked",
    timestamp: "4 days ago",
  },
  {
    id: "sec-008",
    type: "RATE_LIMIT_EXCEEDED",
    description: "Document upload rate exceeded the hourly limit for one account.",
    user: "Daniel Cho",
    resource: "Document Upload",
    severity: "informational",
    action: "allowed",
    timestamp: "5 days ago",
  },
];

export const securityPolicies = [
  { id: "pol-001", label: "Block documents with a detected prompt injection", enabled: true },
  { id: "pol-002", label: "Redact detected PII in chat prompts before reaching the model", enabled: true },
  { id: "pol-003", label: "Require approval for CRM write actions", enabled: true },
  { id: "pol-004", label: "Restrict agents from unapproved external network access", enabled: true },
  { id: "pol-005", label: "Allow assistants to fall back to general knowledge when retrieval is empty", enabled: false },
];
