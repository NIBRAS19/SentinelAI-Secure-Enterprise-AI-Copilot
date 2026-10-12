from sqlalchemy import ARRAY, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """
    A single uploaded file and its ingestion state.

    `status` tracks the pipeline: UPLOADED -> VALIDATING -> EXTRACTING ->
    CHUNKING -> EMBEDDING -> INDEXING -> READY, or FAILED at any step.

    `security_status` is the quarantine flag, independent of `status`:
      - SAFE: no prompt-injection patterns found in extracted text.
      - SUSPICIOUS: injection-like patterns found. The document and its
        chunks still exist and are visible in the UI (so an admin can
        review/delete it), but `document_service` never embeds a
        SUSPICIOUS document's chunks. Since retrieval only searches chunks
        with a non-null embedding, a SUSPICIOUS document structurally
        cannot be surfaced to the RAG pipeline or influence an answer.
      - BLOCKED: reserved for future hard-blocking (e.g. malware scan hit);
        not set by the current pipeline, but modeled now so a future rule
        doesn't need a migration.
    """

    __tablename__ = "documents"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    collection_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("collections.id", ondelete="SET NULL"), nullable=True, index=True
    )
    uploaded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("members.id", ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="UPLOADED")
    security_status: Mapped[str] = mapped_column(String(32), nullable=False, default="SAFE")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_attempt_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Roles permitted to retrieve this document in RAG. NULL/empty = everyone in the org.
    access_roles: Mapped[list[str] | None] = mapped_column(ARRAY(String(50)), nullable=True)

    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
