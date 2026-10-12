import type { Organization, Role, RoleInfo, User } from "@/lib/types";

export const organization: Organization = {
  id: "org-acme",
  name: "Acme Learning & Consulting",
  slug: "acme-learning",
  plan: "Business",
  industry: "Training & Consultancy",
  employeeCount: 250,
  createdAt: "2025-11-03",
};

// The six org-scoped roles a person can actually hold (super_admin is
// platform-level per PRD §7 and isn't offered in the demo switcher below).
export const ROLE_CATALOGUE: RoleInfo[] = [
  { role: "super_admin", label: "Super Admin", description: "Platform-wide administration across every organization." },
  { role: "org_owner", label: "Organization Owner", description: "Full control of the organization: billing, members, and policy." },
  { role: "security_admin", label: "Security Administrator", description: "Owns security policy, PII rules, and injection response." },
  { role: "knowledge_manager", label: "Knowledge Manager", description: "Owns document collections, uploads, and retrieval quality." },
  { role: "manager", label: "Manager", description: "Team-level access, including HR-restricted material." },
  { role: "member", label: "Member", description: "Standard employee: chat and knowledge search only." },
  { role: "auditor", label: "Auditor", description: "Read-only access to audit logs, security events, and activity." },
];

export const DEMO_USERS: Record<Exclude<Role, "super_admin">, User> = {
  org_owner: {
    id: "user-hind",
    name: "Hind",
    email: "hind@acme-learning.example",
    role: "org_owner",
    title: "Organization Owner",
    avatarColor: "bg-gold",
    status: "active",
    lastActive: "Just now",
  },
  security_admin: {
    id: "user-nibras",
    name: "Nibras Ahmed",
    email: "nibras@acme-learning.example",
    role: "security_admin",
    title: "Security Administrator",
    avatarColor: "bg-signal",
    status: "active",
    lastActive: "Just now",
  },
  knowledge_manager: {
    id: "user-daniel",
    name: "Daniel Cho",
    email: "daniel@acme-learning.example",
    role: "knowledge_manager",
    title: "Knowledge Manager",
    avatarColor: "bg-status-safe",
    status: "active",
    lastActive: "12m ago",
  },
  manager: {
    id: "user-sarah",
    name: "Sarah Whitfield",
    email: "sarah@acme-learning.example",
    role: "manager",
    title: "HR Manager",
    avatarColor: "bg-status-warn",
    status: "active",
    lastActive: "1h ago",
  },
  member: {
    id: "user-james",
    name: "James Okafor",
    email: "james@acme-learning.example",
    role: "member",
    title: "Client Success Associate",
    avatarColor: "bg-faint",
    status: "active",
    lastActive: "3h ago",
  },
  auditor: {
    id: "user-elena",
    name: "Elena Vasquez",
    email: "elena@acme-learning.example",
    role: "auditor",
    title: "Compliance Auditor",
    avatarColor: "bg-status-critical",
    status: "active",
    lastActive: "Yesterday",
  },
};

export const DEFAULT_ROLE: Role = "security_admin";

// A few additional org members shown in tables (document owners, audit
// actors) who aren't in the demo role-switcher — keeps the org feeling
// like it has 250 people in it, not six.
export const FLAVOR_MEMBERS = [
  { id: "user-maria", name: "Maria Gonzalez", title: "Customer Success Lead" },
  { id: "user-tom", name: "Tom Becker", title: "Engineering" },
  { id: "user-aisha", name: "Aisha Bello", title: "Training Operations" },
];

export const ALL_MEMBERS: User[] = [
  ...Object.values(DEMO_USERS),
  {
    id: "user-maria",
    name: "Maria Gonzalez",
    email: "maria@acme-learning.example",
    role: "member",
    title: "Customer Success Lead",
    avatarColor: "bg-signal",
    status: "active",
    lastActive: "20m ago",
  },
  {
    id: "user-tom",
    name: "Tom Becker",
    email: "tom@acme-learning.example",
    role: "member",
    title: "Engineering",
    avatarColor: "bg-gold",
    status: "active",
    lastActive: "5h ago",
  },
  {
    id: "user-aisha",
    name: "Aisha Bello",
    email: "aisha@acme-learning.example",
    role: "knowledge_manager",
    title: "Training Operations",
    avatarColor: "bg-status-safe",
    status: "invited",
    lastActive: "—",
  },
];

// Reference matrix for the Admin → Roles & Permissions tab (PRD §7).
export const PERMISSIONS = [
  "documents.read",
  "documents.create",
  "documents.delete",
  "knowledge.manage",
  "chat.use",
  "agents.use",
  "agents.create",
  "agents.approve",
  "security.view",
  "security.manage",
  "audit.view",
  "users.manage",
  "organization.manage",
] as const;

export const ROLE_PERMISSIONS: Record<Exclude<Role, "super_admin">, string[]> = {
  org_owner: [...PERMISSIONS],
  security_admin: ["documents.read", "knowledge.manage", "chat.use", "agents.use", "agents.approve", "security.view", "security.manage", "audit.view"],
  knowledge_manager: ["documents.read", "documents.create", "documents.delete", "knowledge.manage", "chat.use", "agents.use"],
  manager: ["documents.read", "documents.create", "chat.use", "agents.use"],
  member: ["documents.read", "chat.use"],
  auditor: ["documents.read", "security.view", "audit.view"],
};

// Nav-section access used by the app shell to gate the sidebar and route
// content per role (PRD §31: authorization is layered, never assumed).
export const ROLE_ACCESS: Record<Exclude<Role, "super_admin">, string[]> = {
  org_owner: ["dashboard", "chat", "knowledge", "agents", "approvals", "security", "audit", "usage", "admin"],
  security_admin: ["dashboard", "chat", "knowledge", "agents", "approvals", "security", "audit", "usage"],
  knowledge_manager: ["dashboard", "chat", "knowledge", "agents"],
  manager: ["dashboard", "chat", "knowledge", "agents"],
  member: ["dashboard", "chat", "knowledge"],
  auditor: ["dashboard", "security", "audit", "usage"],
};
