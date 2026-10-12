from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Message(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    __tablename__ = "messages"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" | "assistant" | "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # [{"document_id", "document_name", "chunk_id", "page_number", "snippet"}]
    citations: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    restricted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pii_masked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
