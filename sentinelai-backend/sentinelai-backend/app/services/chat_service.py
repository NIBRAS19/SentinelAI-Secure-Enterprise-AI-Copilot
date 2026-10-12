"""
Chat orchestration: PII masking -> injection scan -> permission-aware
retrieval -> LLM call -> citation building -> usage/audit recording.

`restricted` on the returned message and the WARNING-severity security
event are driven by `RetrievalResult.had_unauthorized_match`, never by
"the authorized chunk list came back empty" — see app/ai/rag.py's module
docstring for why those two conditions must stay separate (an off-topic
question must not look like a permission denial).
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import get_embedding_provider
from app.ai.pii import detect_pii, mask_pii
from app.ai.prompt_injection import scan_for_prompt_injection
from app.ai.rag import retrieve_relevant_chunks
from app.core.errors import NotFoundError
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.usage_event import UsageEvent
from app.services import audit_service, llm_service


async def _get_or_create_conversation(
    db: AsyncSession, *, organization_id: str, member_id: str, conversation_id: str | None
) -> Conversation:
    if conversation_id:
        conv = (
            await db.execute(
                select(Conversation).where(Conversation.id == conversation_id, Conversation.organization_id == organization_id)
            )
        ).scalar_one_or_none()
        if conv is None:
            raise NotFoundError("Conversation not found.")
        return conv

    conv = Conversation(organization_id=organization_id, member_id=member_id, title="New conversation")
    db.add(conv)
    await db.flush()
    return conv


async def send_message(
    db: AsyncSession, *, organization_id: str, member_id: str, role: str, conversation_id: str | None, content: str
) -> Message:
    conversation = await _get_or_create_conversation(
        db, organization_id=organization_id, member_id=member_id, conversation_id=conversation_id
    )

    if conversation.title == "New conversation":
        conversation.title = content[:80]

    pii_result = detect_pii(content)
    safe_content = mask_pii(content, pii_result) if pii_result.has_pii else content

    injection = scan_for_prompt_injection(content)
    if injection.is_suspicious:
        await audit_service.record_event(
            db,
            organization_id=organization_id,
            actor_id=member_id,
            actor_label=member_id,
            action="chat.prompt_injection_detected",
            resource_type="conversation",
            resource_id=conversation.id,
            severity="WARNING",
            details={"matched_patterns": injection.matched_patterns},
        )

    user_message = Message(
        organization_id=organization_id,
        conversation_id=conversation.id,
        role="user",
        content=safe_content,
        pii_masked=pii_result.has_pii,
    )
    db.add(user_message)

    provider = get_embedding_provider()
    query_embedding = await provider.embed(safe_content)
    retrieval = await retrieve_relevant_chunks(
        db, organization_id=organization_id, role=role, query=safe_content, query_embedding=query_embedding
    )

    if retrieval.had_unauthorized_match:
        await audit_service.record_event(
            db,
            organization_id=organization_id,
            actor_id=member_id,
            actor_label=member_id,
            action="chat.unauthorized_retrieval_blocked",
            resource_type="conversation",
            resource_id=conversation.id,
            severity="WARNING",
            details={"role": role},
        )

    answer_text, citations = await llm_service.generate_answer(query=safe_content, chunks=retrieval.chunks)

    assistant_message = Message(
        organization_id=organization_id,
        conversation_id=conversation.id,
        role="assistant",
        content=answer_text,
        citations=citations,
        restricted=retrieval.had_unauthorized_match,
        pii_masked=False,
    )
    db.add(assistant_message)

    # Touched unconditionally (not just on the first message) so
    # list_conversations()'s "most recently active" sort stays correct —
    # SQLAlchemy's onupdate only fires when some column on the row changes,
    # and title only changes on turn one.
    conversation.updated_at = datetime.now(timezone.utc)

    db.add(UsageEvent(organization_id=organization_id, member_id=member_id, event_type="chat_message", token_count=len(content.split())))

    await db.flush()
    return assistant_message


async def list_conversations(db: AsyncSession, *, organization_id: str, member_id: str) -> list[Conversation]:
    stmt = (
        select(Conversation)
        .where(Conversation.organization_id == organization_id, Conversation.member_id == member_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def list_messages(db: AsyncSession, *, organization_id: str, conversation_id: str) -> list[Message]:
    stmt = (
        select(Message)
        .where(Message.organization_id == organization_id, Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list((await db.execute(stmt)).scalars().all())
