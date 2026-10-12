"""
Authentication flows: register, login, refresh (with rotation + reuse
detection), logout, password reset.

Refresh token rotation: every refresh_session() call issues a brand new
refresh token and revokes the old one. If an already-revoked token's hash
is presented again, that's a strong signal the token was stolen and the
legitimate owner already rotated past it (or an attacker is replaying a
captured token) — so ALL sessions for that member are revoked, forcing
every device to re-authenticate.

Login timing: `_dummy_hash` is verified against even when the email
doesn't exist, so the two code paths (unknown email vs. wrong password)
take roughly the same amount of work and don't let a timing side-channel
reveal which emails are registered.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, UnauthorizedError
from app.core.security import (
    TokenError,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    fingerprint_password_hash,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.member import Member
from app.models.session import Session
from app.services import organization_service

# A real-looking hash with a random salt, verified against on every unknown-email
# login attempt so the response time doesn't leak whether the email exists.
_DUMMY_HASH = hash_password("dummy-password-for-timing-safety")


async def register(
    db: AsyncSession, *, organization_name: str, full_name: str, email: str, password: str
) -> tuple[Member, str, str]:
    org, owner = await organization_service.create_organization_with_owner(
        db, organization_name=organization_name, owner_full_name=full_name, owner_email=email, owner_password=password
    )
    access = create_access_token(owner.id, extra_claims={"org": org.id, "role": owner.role})
    refresh = create_refresh_token(owner.id)
    await _store_refresh_session(db, member_id=owner.id, refresh_token=refresh)
    return owner, access, refresh


async def login(db: AsyncSession, *, email: str, password: str) -> tuple[Member, str, str]:
    member = (await db.execute(select(Member).where(Member.email == email.lower()))).scalar_one_or_none()

    if member is None:
        verify_password(password, _DUMMY_HASH)  # constant-time-ish: do the work anyway
        raise UnauthorizedError("Invalid email or password.")

    if not verify_password(password, member.password_hash) or not member.is_active:
        raise UnauthorizedError("Invalid email or password.")

    access = create_access_token(member.id, extra_claims={"org": member.organization_id, "role": member.role})
    refresh = create_refresh_token(member.id)
    await _store_refresh_session(db, member_id=member.id, refresh_token=refresh)
    return member, access, refresh


async def _store_refresh_session(db: AsyncSession, *, member_id: str, refresh_token: str) -> None:
    settings = get_settings()
    session = Session(
        member_id=member_id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    await db.flush()


async def refresh_session(db: AsyncSession, *, refresh_token: str) -> tuple[str, str]:
    try:
        claims = decode_token(refresh_token)
    except TokenError as exc:
        raise UnauthorizedError("Invalid refresh token.") from exc

    if claims.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token.")

    member_id = claims["sub"]
    token_hash = hash_token(refresh_token)
    session = (
        await db.execute(select(Session).where(Session.refresh_token_hash == token_hash))
    ).scalar_one_or_none()

    if session is None:
        # Unknown token hash: either fabricated or from before this server's session
        # table existed. Treat as invalid, no reuse-revocation needed (nothing to revoke).
        raise UnauthorizedError("Invalid refresh token.")

    if session.is_revoked:
        # Reuse of an already-rotated-away token: possible theft. Revoke every
        # session for this member so all devices must re-authenticate.
        await _revoke_all_sessions(db, member_id=member_id)
        raise UnauthorizedError("This session has been revoked. Please log in again.")

    session.is_revoked = True
    await db.flush()

    member = (await db.execute(select(Member).where(Member.id == member_id))).scalar_one_or_none()
    if member is None or not member.is_active:
        raise UnauthorizedError("Account is no longer active.")

    new_access = create_access_token(member.id, extra_claims={"org": member.organization_id, "role": member.role})
    new_refresh = create_refresh_token(member.id)
    await _store_refresh_session(db, member_id=member.id, refresh_token=new_refresh)
    return new_access, new_refresh


async def _revoke_all_sessions(db: AsyncSession, *, member_id: str) -> None:
    sessions = (await db.execute(select(Session).where(Session.member_id == member_id))).scalars().all()
    for s in sessions:
        s.is_revoked = True
    await db.flush()


async def logout(db: AsyncSession, *, refresh_token: str) -> None:
    token_hash = hash_token(refresh_token)
    session = (await db.execute(select(Session).where(Session.refresh_token_hash == token_hash))).scalar_one_or_none()
    if session is not None:
        session.is_revoked = True
        await db.flush()


async def request_password_reset(db: AsyncSession, *, email: str) -> str | None:
    """Returns a reset token, or None if the email doesn't exist (caller should respond identically either way)."""
    member = (await db.execute(select(Member).where(Member.email == email.lower()))).scalar_one_or_none()
    if member is None:
        return None
    fingerprint = fingerprint_password_hash(member.password_hash)
    settings = get_settings()
    return create_password_reset_token(member.id, fingerprint, expires_minutes=settings.password_reset_token_expire_minutes)


async def reset_password(db: AsyncSession, *, token: str, new_password: str) -> None:
    try:
        claims = decode_token(token)
    except TokenError as exc:
        raise AppError("This reset link is invalid or has expired.", code="INVALID_RESET_TOKEN", status_code=400) from exc

    if claims.get("type") != "password_reset":
        raise AppError("This reset link is invalid or has expired.", code="INVALID_RESET_TOKEN", status_code=400)

    member = (await db.execute(select(Member).where(Member.id == claims["sub"]))).scalar_one_or_none()
    if member is None:
        raise AppError("This reset link is invalid or has expired.", code="INVALID_RESET_TOKEN", status_code=400)

    current_fingerprint = fingerprint_password_hash(member.password_hash)
    if claims.get("fp") != current_fingerprint:
        # Password already changed since this token was issued -> single-use enforcement.
        raise AppError("This reset link has already been used or is out of date.", code="RESET_TOKEN_CONSUMED", status_code=400)

    member.password_hash = hash_password(new_password)
    await db.flush()
    await _revoke_all_sessions(db, member_id=member.id)
