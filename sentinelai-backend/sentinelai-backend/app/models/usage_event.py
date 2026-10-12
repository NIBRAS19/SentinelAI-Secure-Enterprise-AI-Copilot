from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UsageEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """One row per billable/trackable unit of activity, feeding the analytics dashboards."""

    __tablename__ = "usage_events"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    member_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "chat_message" | "document_upload" | "agent_run"
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
