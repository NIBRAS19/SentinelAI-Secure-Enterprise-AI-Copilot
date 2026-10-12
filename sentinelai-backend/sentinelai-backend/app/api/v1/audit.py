"""
Deliberately exposes ONLY a GET/list route. There is no update or delete
route for audit logs anywhere in this API — that's what makes the log
append-only in practice, not just in intent.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.database import get_db
from app.schemas.common import Page
from app.schemas.security import AuditLogOut
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=Page[AuditLogOut])
async def list_logs(
    severity: str | None = None,
    action: str | None = None,
    page: int = 1,
    page_size: int = 50,
    current: CurrentMember = Depends(require("audit.view")),
    db: AsyncSession = Depends(get_db),
):
    logs, total = await audit_service.list_audit_logs(
        db, organization_id=current.organization_id, severity=severity, action=action, page=page, page_size=page_size
    )
    return Page[AuditLogOut](items=[AuditLogOut.model_validate(l) for l in logs], total=total, page=page, page_size=page_size)
