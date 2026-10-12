"""
Role-based access control, defined entirely in code rather than as
database-backed roles/permissions tables. The PRD's 7 roles have fixed,
product-defined capabilities that don't vary per tenant, so a static
dict is simpler, faster (no join/query to check a permission), and
impossible to corrupt via a bad migration or admin mistake. If a future
requirement needs per-tenant custom roles, this module is the single
place that would need to grow into a DB-backed model.
"""
from enum import Enum


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORG_OWNER = "org_owner"
    SECURITY_ADMIN = "security_admin"
    KNOWLEDGE_MANAGER = "knowledge_manager"
    MANAGER = "manager"
    MEMBER = "member"
    AUDITOR = "auditor"


# Permission strings follow "<resource>.<action>".
ROLE_PERMISSIONS: dict[str, set[str]] = {
    Role.SUPER_ADMIN: {"*"},  # platform operator; bypasses per-permission checks entirely
    Role.ORG_OWNER: {
        "org.manage", "members.manage", "documents.read", "documents.write", "documents.delete",
        "collections.manage", "chat.use", "agents.manage", "agents.approve", "security.view",
        "security.manage", "audit.view", "analytics.view",
    },
    Role.SECURITY_ADMIN: {
        "documents.read", "security.view", "security.manage", "audit.view", "analytics.view",
        "agents.approve",
    },
    Role.KNOWLEDGE_MANAGER: {
        "documents.read", "documents.write", "documents.delete", "collections.manage", "chat.use",
        "analytics.view",
    },
    Role.MANAGER: {
        "documents.read", "chat.use", "agents.manage", "agents.approve", "analytics.view",
    },
    Role.MEMBER: {"documents.read", "chat.use"},
    Role.AUDITOR: {"audit.view", "security.view", "analytics.view", "documents.read"},
}


def has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return "*" in perms or permission in perms


def require_permission(role: str, permission: str) -> None:
    from app.core.errors import ForbiddenError

    if not has_permission(role, permission):
        raise ForbiddenError(f"Role '{role}' lacks permission '{permission}'.")


# Document-level access control. Every document carries an optional
# access_roles list (the roles allowed to retrieve it); an empty/null list
# means "everyone in the organization." super_admin and org_owner can
# always see everything regardless of access_roles.
def can_access_document(role: str, access_roles: list[str] | None) -> bool:
    if role in (Role.SUPER_ADMIN, Role.ORG_OWNER):
        return True
    if not access_roles:
        return True
    return role in access_roles
