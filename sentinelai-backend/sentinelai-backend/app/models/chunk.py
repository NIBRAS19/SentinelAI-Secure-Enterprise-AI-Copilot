from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.ai.constants import EMBEDDING_DIM
from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Chunk(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """
    A chunk of extracted document text plus its embedding vector.

    `embedding` is nullable deliberately: a SUSPICIOUS document's chunks
    are written with `embedding = NULL` and never backfilled, so any query
    that does `WHERE embedding IS NOT NULL` (the vector-search query always
    does) structurally excludes them. This is the quarantine mechanism
    referenced in document.py — it isn't a status flag the retrieval code
    has to remember to check, it's a property of the data itself.
    """

    __tablename__ = "chunks"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
