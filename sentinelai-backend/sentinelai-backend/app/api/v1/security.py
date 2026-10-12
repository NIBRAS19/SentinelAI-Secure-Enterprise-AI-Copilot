from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.database import get_db
from app.core.errors import NotFoundError
from app.models.security_policy import SecurityPolicy
from app.schemas.security import AuditLogOut, SecurityPolicyOut, SecurityPolicyUpdateRequest
from app.services import audit_service

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/policies", response_model=SecurityPolicyOut)
async def get_policy(current: CurrentMember = Depends(require("security.view")), db: AsyncSession = Depends(get_db)):
    policy = (
        await db.execute(select(SecurityPolicy).where(SecurityPolicy.organization_id == current.organization_id))
    ).scalar_one_or_none()
    if policy is None:
        raise NotFoundError("Security policy not found for this organization.")
    return SecurityPolicyOut.model_validate(policy)


@router.patch("/policies", response_model=SecurityPolicyOut)
async def update_policy(
    payload: SecurityPolicyUpdateRequest,
    current: CurrentMember = Depends(require("security.manage")),
    db: AsyncSession = Depends(get_db),
):
    policy = (
        await db.execute(select(SecurityPolicy).where(SecurityPolicy.organization_id == current.organization_id))
    ).scalar_one_or_none()
    if policy is None:
        raise NotFoundError("Security policy not found for this organization.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)
    await db.flush()

    await audit_service.record_event(
        db,
        organization_id=current.organization_id,
        actor_id=current.id,
        actor_label=current.email,
        action="security.policy_updated",
        resource_type="security_policy",
        resource_id=policy.id,
        details=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    return SecurityPolicyOut.model_validate(policy)
