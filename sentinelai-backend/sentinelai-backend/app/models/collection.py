from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Collection(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin):
    """A named grouping of documents (e.g. 'HR Policies', 'Engineering Runbooks')."""

    __tablename__ = "collections"

    organization_id: Mapped[str] = TenantScopedMixin.org_fk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
