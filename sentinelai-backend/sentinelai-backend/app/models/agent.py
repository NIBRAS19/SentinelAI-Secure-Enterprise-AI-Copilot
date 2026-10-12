from sqlalchemy import ARRAY, Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Agent(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """
    An AI agent configuration: a name, a system prompt, and the set of
    tools it's allowed to call. `require_approval` is agent-level; combined
    with each tool's own risk_level (see app/ai/tools.py), this jointly
    decides whether a given tool call pauses for human sign-off (see
    agent_service.requires_approval()).
    """

    __tablename__ = "agents"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    allowed_tools: Mapped[list[str]] = mapped_column(ARRAY(String(100)), nullable=False, default=list)
    require_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
