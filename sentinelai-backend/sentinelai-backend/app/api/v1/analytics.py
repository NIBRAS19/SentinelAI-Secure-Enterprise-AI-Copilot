from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.database import get_db
from app.models.document import Document
from app.models.message import Message
from app.models.usage_event import UsageEvent

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(current: CurrentMember = Depends(require("analytics.view")), db: AsyncSession = Depends(get_db)):
    org_id = current.organization_id

    doc_count = (
        await db.execute(select(func.count()).select_from(Document).where(Document.organization_id == org_id))
    ).scalar_one()
    ready_docs = (
        await db.execute(
            select(func.count()).select_from(Document).where(Document.organization_id == org_id, Document.status == "READY")
        )
    ).scalar_one()
    quarantined_docs = (
        await db.execute(
            select(func.count())
            .select_from(Document)
            .where(Document.organization_id == org_id, Document.security_status == "SUSPICIOUS")
        )
    ).scalar_one()
    message_count = (
        await db.execute(select(func.count()).select_from(Message).where(Message.organization_id == org_id, Message.role == "assistant"))
    ).scalar_one()
    restricted_count = (
        await db.execute(
            select(func.count())
            .select_from(Message)
            .where(Message.organization_id == org_id, Message.role == "assistant", Message.restricted.is_(True))
        )
    ).scalar_one()
    total_tokens = (
        await db.execute(select(func.coalesce(func.sum(UsageEvent.token_count), 0)).where(UsageEvent.organization_id == org_id))
    ).scalar_one()

    return {
        "documents": {"total": doc_count, "ready": ready_docs, "quarantined": quarantined_docs},
        "chat": {"assistant_messages": message_count, "restricted_responses": restricted_count},
        "usage": {"total_tokens": int(total_tokens)},
    }
