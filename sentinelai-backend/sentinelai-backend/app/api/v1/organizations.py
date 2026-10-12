from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.database import get_db
from app.schemas.auth import MemberOut
from app.schemas.organization import InviteMemberRequest, MemberListOut, UpdateMemberRequest
from app.services import audit_service, organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/members", response_model=MemberListOut)
async def list_members(current: CurrentMember = Depends(require("members.manage")), db: AsyncSession = Depends(get_db)):
    members = await organization_service.list_members(db, organization_id=current.organization_id)
    return MemberListOut(items=[MemberOut.model_validate(m) for m in members])


@router.post("/members", response_model=MemberOut, status_code=201)
async def invite_member(
    payload: InviteMemberRequest, current: CurrentMember = Depends(require("members.manage")), db: AsyncSession = Depends(get_db)
):
    member = await organization_service.invite_member(
        db,
        organization_id=current.organization_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        temporary_password=payload.temporary_password,
    )
    await audit_service.record_event(
        db,
        organization_id=current.organization_id,
        actor_id=current.id,
        actor_label=current.email,
        action="member.invited",
        resource_type="member",
        resource_id=member.id,
        details={"email": payload.email, "role": payload.role},
    )
    await db.commit()
    return MemberOut.model_validate(member)


@router.patch("/members/{member_id}", response_model=MemberOut)
async def update_member(
    member_id: str,
    payload: UpdateMemberRequest,
    current: CurrentMember = Depends(require("members.manage")),
    db: AsyncSession = Depends(get_db),
):
    member = await organization_service.update_member(
        db,
        organization_id=current.organization_id,
        member_id=member_id,
        role=payload.role,
        is_active=payload.is_active,
        full_name=payload.full_name,
    )
    await audit_service.record_event(
        db,
        organization_id=current.organization_id,
        actor_id=current.id,
        actor_label=current.email,
        action="member.updated",
        resource_type="member",
        resource_id=member.id,
        details=payload.model_dump(exclude_unset=True),
    )
    await db.commit()
    return MemberOut.model_validate(member)
