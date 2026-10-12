"""Organization and membership management."""
import re
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.member import Member
from app.models.organization import Organization
from app.models.security_policy import SecurityPolicy
from app.policies.rbac import Role

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    """
    NFKD-normalize before stripping, so an accented leading character
    degrades to its closest ASCII form instead of being dropped outright.
    A naive `name.lower()` + non-ASCII strip turns "Über Corp" into
    "ber-corp" (losing the "U"); NFKD decomposes "Ü" into "U" + a
    combining diaeresis, and the diaeresis (a non-ASCII combining mark)
    is what gets dropped by the ascii encode/ignore step, leaving "uber".
    """
    normalized = unicodedata.normalize("NFKD", name)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = _SLUG_RE.sub("-", ascii_only.lower()).strip("-")
    return slug or "org"


async def _unique_slug(db: AsyncSession, base_slug: str) -> str:
    candidate = base_slug
    suffix = 1
    while True:
        existing = (await db.execute(select(Organization).where(Organization.slug == candidate))).scalar_one_or_none()
        if existing is None:
            return candidate
        suffix += 1
        candidate = f"{base_slug}-{suffix}"


async def create_organization_with_owner(
    db: AsyncSession, *, organization_name: str, owner_full_name: str, owner_email: str, owner_password: str
) -> tuple[Organization, Member]:
    existing_member = (await db.execute(select(Member).where(Member.email == owner_email.lower()))).scalar_one_or_none()
    if existing_member is not None:
        raise ConflictError("An account with this email already exists.")

    base_slug = slugify(organization_name)
    slug = await _unique_slug(db, base_slug)

    org = Organization(name=organization_name, slug=slug)
    db.add(org)
    await db.flush()

    policy = SecurityPolicy(organization_id=org.id)
    db.add(policy)

    owner = Member(
        organization_id=org.id,
        email=owner_email.lower(),
        full_name=owner_full_name,
        password_hash=hash_password(owner_password),
        role=Role.ORG_OWNER,
        is_active=True,
    )
    db.add(owner)
    await db.flush()
    return org, owner


async def invite_member(
    db: AsyncSession, *, organization_id: str, email: str, full_name: str, role: str, temporary_password: str
) -> Member:
    existing = (await db.execute(select(Member).where(Member.email == email.lower()))).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("A member with this email already exists.")

    member = Member(
        organization_id=organization_id,
        email=email.lower(),
        full_name=full_name,
        password_hash=hash_password(temporary_password),
        role=role,
        is_active=True,
    )
    db.add(member)
    await db.flush()
    return member


async def _count_active_owners(db: AsyncSession, organization_id: str, exclude_member_id: str | None = None) -> int:
    stmt = select(func.count()).select_from(Member).where(
        Member.organization_id == organization_id, Member.role == Role.ORG_OWNER, Member.is_active.is_(True)
    )
    if exclude_member_id:
        stmt = stmt.where(Member.id != exclude_member_id)
    return (await db.execute(stmt)).scalar_one()


async def update_member(
    db: AsyncSession,
    *,
    organization_id: str,
    member_id: str,
    role: str | None = None,
    is_active: bool | None = None,
    full_name: str | None = None,
) -> Member:
    member = (
        await db.execute(select(Member).where(Member.id == member_id, Member.organization_id == organization_id))
    ).scalar_one_or_none()
    if member is None:
        raise NotFoundError("Member not found.")

    would_demote = role is not None and member.role == Role.ORG_OWNER and role != Role.ORG_OWNER
    would_deactivate = is_active is False and member.role == Role.ORG_OWNER and member.is_active

    if would_demote or would_deactivate:
        remaining = await _count_active_owners(db, organization_id, exclude_member_id=member.id)
        if remaining == 0:
            raise AppError("An organization must keep at least one active owner.", code="LAST_OWNER", status_code=409)

    if role is not None:
        member.role = role
    if is_active is not None:
        member.is_active = is_active
    if full_name is not None:
        member.full_name = full_name

    await db.flush()
    return member


async def list_members(db: AsyncSession, *, organization_id: str) -> list[Member]:
    stmt = select(Member).where(Member.organization_id == organization_id).order_by(Member.created_at.asc())
    return list((await db.execute(stmt)).scalars().all())
