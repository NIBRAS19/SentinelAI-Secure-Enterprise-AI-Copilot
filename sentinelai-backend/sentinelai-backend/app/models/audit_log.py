from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """
    Append-only. No API route ever updates or deletes a row in this table —
    that's enforced by omission (api/v1/audit.py only defines a GET/list
    route), not by a database trigger, so it's worth keeping that way
    deliberately rather than "forgetting" to add write routes later.
    """

    __tablename__ = "audit_logs"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    actor_label: Mapped[str] = mapped_column(String(255), nullable=False)  # denormalized, survives actor deletion
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "document.upload", "security.policy_updated"
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="INFO")  # INFO|WARNING|CRITICAL
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
