from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Session(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    One row per issued refresh token (identified by its sha256 hash, never
    the raw token). Enables revocation and the reuse-detection flow: if a
    revoked token's hash is presented again, every session for that member
    is revoked, since that pattern indicates token theft.
    """

    __tablename__ = "sessions"

    member_id: Mapped[str] = mapped_column(String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
