"""
Append-only audit logging. No function here updates or deletes a row —
that invariant is enforced by simply never writing such a function, and by
api/v1/audit.py only ever exposing a GET/list route.
"""
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def record_event(
    db: AsyncSession,
    *,
    organization_id: str,
    actor_id: Optional[str],
    actor_label: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    severity: str = "INFO",
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        organization_id=organization_id,
        actor_id=actor_id,
        actor_label=actor_label,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        severity=severity,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
    return entry


async def list_audit_logs(
    db: AsyncSession,
    *,
    organization_id: str,
    severity: Optional[str] = None,
    action: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[AuditLog], int]:
    """
    Builds ONE filters list and reuses it for both the count query and the
    paginated results query, so they can never disagree (an earlier draft
    counted against an unfiltered query while paginating a filtered one).
    """
    filters = [AuditLog.organization_id == organization_id]
    if severity:
        filters.append(AuditLog.severity == severity)
    if action:
        filters.append(AuditLog.action == action)

    count_stmt = select(func.count()).select_from(AuditLog).where(*filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(AuditLog)
        .where(*filters)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows), total
