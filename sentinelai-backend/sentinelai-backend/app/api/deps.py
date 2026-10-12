"""
Shared FastAPI dependencies: the authenticated member, and permission
enforcement. `CurrentMember.organization_id` is the ONLY source of truth
for which tenant a request operates on — routes must never accept an
organization_id from a path/query/body parameter and use that instead,
or one tenant could read/write another tenant's rows by guessing an id.
"""
from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import UnauthorizedError
from app.core.security import TokenError, decode_token
from app.models.member import Member
from app.policies.rbac import require_permission


@dataclass
class CurrentMember:
    id: str
    organization_id: str
    role: str
    email: str
    full_name: str


async def get_current_member(
    authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)
) -> CurrentMember:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = decode_token(token)
    except TokenError as exc:
        raise UnauthorizedError("Invalid or expired access token.") from exc

    if claims.get("type") != "access":
        raise UnauthorizedError("Invalid access token.")

    member = (await db.execute(select(Member).where(Member.id == claims["sub"]))).scalar_one_or_none()
    if member is None or not member.is_active:
        raise UnauthorizedError("Account is no longer active.")

    return CurrentMember(
        id=member.id, organization_id=member.organization_id, role=member.role, email=member.email, full_name=member.full_name
    )


def require(permission: str):
    async def _checker(member: CurrentMember = Depends(get_current_member)) -> CurrentMember:
        require_permission(member.role, permission)
        return member

    return _checker
