from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Member(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """A user account, scoped to exactly one organization (single-tenant membership per account)."""

    __tablename__ = "members"
    __table_args__ = ()

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
