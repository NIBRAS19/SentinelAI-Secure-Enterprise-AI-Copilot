from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.database import get_db
from app.schemas.chat import ConversationOut, MessageOut, SendMessageRequest
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/messages", response_model=MessageOut)
async def send_message(
    payload: SendMessageRequest, current: CurrentMember = Depends(require("chat.use")), db: AsyncSession = Depends(get_db)
):
    message = await chat_service.send_message(
        db,
        organization_id=current.organization_id,
        member_id=current.id,
        role=current.role,
        conversation_id=payload.conversation_id,
        content=payload.content,
    )
    await db.commit()
    return MessageOut.model_validate(message)


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(current: CurrentMember = Depends(require("chat.use")), db: AsyncSession = Depends(get_db)):
    conversations = await chat_service.list_conversations(db, organization_id=current.organization_id, member_id=current.id)
    return [ConversationOut.model_validate(c) for c in conversations]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: str, current: CurrentMember = Depends(require("chat.use")), db: AsyncSession = Depends(get_db)
):
    messages = await chat_service.list_messages(db, organization_id=current.organization_id, conversation_id=conversation_id)
    return [MessageOut.model_validate(m) for m in messages]
