// Shared domain types for SentinelAI's frontend. These mirror the data
// model sketched in the PRD (§7 roles, §25 tables) closely enough that
// swapping lib/mock/* for real API calls should not require touching
// component code.

export type Role =
  | "super_admin"
  | "org_owner"
  | "security_admin"
  | "knowledge_manager"
  | "manager"
  | "member"
  | "auditor";

export interface RoleInfo {
  role: Role;
  label: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  avatarColor: string; // tailwind bg-* class
  status?: "active" | "invited" | "suspended";
  lastActive?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  industry: string;
  employeeCount: number;
  createdAt: string;
}

export type DocumentStatus =
  | "UPLOADED"
  | "VALIDATING"
  | "EXTRACTING"
  | "CHUNKING"
  | "EMBEDDING"
  | "INDEXING"
  | "READY"
  | "PROCESSING"
  | "FAILED"
  | "ARCHIVED";

export type SecurityScanStatus = "SAFE" | "SUSPICIOUS" | "BLOCKED";
export type PiiStatus = "none" | "masked" | "blocked";
export type Visibility = "internal" | "restricted";

export interface DocumentItem {
  id: string;
  name: string;
  collectionId: string;
  mimeType: string;
  status: DocumentStatus;
  securityStatus: SecurityScanStatus;
  piiStatus: PiiStatus;
  owner: string;
  chunkCount: number;
  visibility: Visibility;
  allowedRoles: Role[];
  updatedAt: string;
  createdAt: string;
  sizeKb: number;
  flaggedSnippet?: string;
  flaggedReason?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
}

export interface Citation {
  documentId: string;
  documentName: string;
  page?: number;
  snippet: string;
}

export type Confidence = "high" | "medium" | "low";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: Confidence;
  restricted?: boolean;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  assistant: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "informational";

export interface SecurityEvent {
  id: string;
  type: string;
  description: string;
  user?: string;
  resource?: string;
  severity: SeverityLevel;
  action: "blocked" | "masked" | "allowed" | "flagged";
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  eventType: string;
  category: "AUTH" | "USER" | "DOCUMENT" | "KNOWLEDGE" | "AI" | "AGENT" | "TOOL" | "SECURITY" | "POLICY" | "ADMIN" | "SYSTEM";
  user: string;
  resource?: string;
  severity: SeverityLevel;
  ip: string;
  timestamp: string;
  details?: string;
}

export type ToolRisk = "low" | "medium" | "high";

export interface AgentTool {
  id: string;
  name: string;
  risk: ToolRisk;
  requiresApproval: boolean;
  networkAccess: boolean;
}

export interface AgentStep {
  id: string;
  time: string;
  label: string;
  detail?: string;
  status: "done" | "pending" | "blocked";
}

export interface AgentRun {
  id: string;
  agentId: string;
  title: string;
  status: "completed" | "awaiting_approval" | "failed" | "running";
  startedAt: string;
  finishedAt?: string;
  steps: AgentStep[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  tools: AgentTool[];
  requireApproval: boolean;
  restrictExternalNetwork: boolean;
  maxSteps: number;
  timeoutSec: number;
  runs: AgentRun[];
}

export interface ApprovalRequest {
  id: string;
  agentName: string;
  requestedBy: string;
  tool: string;
  payloadSummary: string;
  riskLevel: ToolRisk;
  reason: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface UsagePoint {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface ModelUsage {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
}

export const AVAILABLE_TOOLS: AgentTool[] = [
  { id: "knowledge_search", name: "Knowledge Search", risk: "low", requiresApproval: false, networkAccess: false },
  { id: "calculator", name: "Calculator", risk: "low", requiresApproval: false, networkAccess: false },
  { id: "crm_lookup", name: "CRM Lookup", risk: "medium", requiresApproval: true, networkAccess: true },
  { id: "http_api", name: "External HTTP Request", risk: "high", requiresApproval: true, networkAccess: true },
];
