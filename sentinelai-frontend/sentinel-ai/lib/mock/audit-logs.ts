import type { AuditLogEntry } from "@/lib/types";

export const auditLogs: AuditLogEntry[] = [
  { id: "aud-001", eventType: "USER_LOGIN", category: "AUTH", user: "nibras@acme-learning.example", severity: "informational", ip: "10.44.•.•", timestamp: "2026-09-26 08:58" },
  { id: "aud-002", eventType: "DOCUMENT_ACCESS", category: "DOCUMENT", user: "james@acme-learning.example", resource: "employee-handbook.pdf", severity: "informational", ip: "10.51.•.•", timestamp: "2026-09-26 09:03" },
  { id: "aud-003", eventType: "AI_REQUEST", category: "AI", user: "james@acme-learning.example", resource: "assistant=HR Copilot", severity: "informational", ip: "10.51.•.•", timestamp: "2026-09-26 09:04" },
  { id: "aud-004", eventType: "UNAUTHORIZED_RETRIEVAL_BLOCKED", category: "SECURITY", user: "james@acme-learning.example", resource: "compensation-benefits-guide.pdf", severity: "medium", ip: "10.51.•.•", timestamp: "2026-09-26 09:04", details: "Permission filter excluded a restricted document from context." },
  { id: "aud-005", eventType: "DOCUMENT_UPLOADED", category: "DOCUMENT", user: "tom@acme-learning.example", resource: "vendor-contract-draft.docx", severity: "informational", ip: "10.60.•.•", timestamp: "2026-09-26 09:11" },
  { id: "aud-006", eventType: "PROMPT_INJECTION_BLOCKED", category: "SECURITY", user: "system", resource: "vendor-contract-draft.docx", severity: "high", ip: "—", timestamp: "2026-09-26 09:12", details: "Instruction-override pattern detected during ingestion scan." },
  { id: "aud-007", eventType: "AGENT_RUN_STARTED", category: "AGENT", user: "maria@acme-learning.example", resource: "Customer Operations Agent", severity: "informational", ip: "10.48.•.•", timestamp: "2026-09-26 10:42" },
  { id: "aud-008", eventType: "APPROVAL_REQUESTED", category: "AGENT", user: "Customer Operations Agent", resource: "POST /crm/leads", severity: "medium", ip: "—", timestamp: "2026-09-26 10:42" },
  { id: "aud-009", eventType: "APPROVAL_GRANTED", category: "AGENT", user: "nibras@acme-learning.example", resource: "POST /crm/leads", severity: "informational", ip: "10.44.•.•", timestamp: "2026-09-26 10:42" },
  { id: "aud-010", eventType: "TOOL_EXECUTED", category: "TOOL", user: "Customer Operations Agent", resource: "POST /crm/leads", severity: "informational", ip: "—", timestamp: "2026-09-26 10:42" },
  { id: "aud-011", eventType: "SECURITY_POLICY_UPDATED", category: "POLICY", user: "nibras@acme-learning.example", resource: "Require approval for CRM write actions", severity: "informational", ip: "10.44.•.•", timestamp: "2026-09-25 17:20" },
  { id: "aud-012", eventType: "ROLE_CHANGED", category: "ADMIN", user: "hind@acme-learning.example", resource: "aisha@acme-learning.example → Knowledge Manager", severity: "informational", ip: "10.30.•.•", timestamp: "2026-09-25 14:02" },
  { id: "aud-013", eventType: "APPROVAL_REJECTED", category: "AGENT", user: "nibras@acme-learning.example", resource: "DELETE /crm/contacts/88", severity: "medium", ip: "10.44.•.•", timestamp: "2026-09-24 11:37", details: "Destructive action outside agent's approved scope." },
  { id: "aud-014", eventType: "DOCUMENT_ACCESS", category: "DOCUMENT", user: "sarah@acme-learning.example", resource: "compensation-benefits-guide.pdf", severity: "informational", ip: "10.33.•.•", timestamp: "2026-09-24 09:51" },
  { id: "aud-015", eventType: "PII_MASKED", category: "SECURITY", user: "maria@acme-learning.example", resource: "chat message", severity: "low", ip: "10.48.•.•", timestamp: "2026-09-24 15:20" },
  { id: "aud-016", eventType: "USER_LOGOUT", category: "AUTH", user: "daniel@acme-learning.example", severity: "informational", ip: "10.22.•.•", timestamp: "2026-09-24 18:44" },
  { id: "aud-017", eventType: "MEMBER_INVITED", category: "ADMIN", user: "hind@acme-learning.example", resource: "aisha@acme-learning.example", severity: "informational", ip: "10.30.•.•", timestamp: "2026-09-23 10:16" },
  { id: "aud-018", eventType: "RATE_LIMIT_EXCEEDED", category: "SECURITY", user: "tom@acme-learning.example", resource: "AI Gateway", severity: "informational", ip: "10.60.•.•", timestamp: "2026-09-23 09:30" },
  { id: "aud-019", eventType: "AI_REQUEST", category: "AI", user: "nibras@acme-learning.example", resource: "assistant=Security Assistant", severity: "informational", ip: "10.44.•.•", timestamp: "2026-09-22 16:03" },
  { id: "aud-020", eventType: "DOCUMENT_REPROCESSED", category: "KNOWLEDGE", user: "daniel@acme-learning.example", resource: "api-integration-guide.docx", severity: "informational", ip: "10.22.•.•", timestamp: "2026-09-22 11:47" },
];
