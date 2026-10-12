"""Shared mixins for id/timestamp columns and tenant scoping."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column


def new_uuid() -> str:
    return str(uuid.uuid4())


class UUIDPrimaryKeyMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class TenantScopedMixin:
    """
    Every tenant-owned row carries organization_id. Every query against a
    tenant-scoped table MUST filter on this column using the organization_id
    taken from the authenticated JWT/session — never from a client-supplied
    path or query parameter. This is what closes the IDOR class of bugs
    where one tenant could read or modify another tenant's rows by guessing
    an id.
    """

    @staticmethod
    def org_fk():
        return mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
