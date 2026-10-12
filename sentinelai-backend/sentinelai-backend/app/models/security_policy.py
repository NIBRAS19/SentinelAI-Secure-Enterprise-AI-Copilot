from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class SecurityPolicy(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """Per-organization toggles for the security features (one row per org, created on org creation)."""

    __tablename__ = "security_policies"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    pii_masking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    prompt_injection_detection_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    require_agent_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    min_retrieval_score_override: Mapped[str | None] = mapped_column(String(10), nullable=True)
