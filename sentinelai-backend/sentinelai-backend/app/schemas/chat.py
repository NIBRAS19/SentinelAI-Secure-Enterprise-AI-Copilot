from typing import Optional

from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    content: str = Field(min_length=1, max_length=8000)


class CitationOut(BaseModel):
    document_id: str
    document_name: str
    chunk_id: str
    page_number: Optional[int]
    snippet: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: Optional[list[CitationOut]]
    restricted: bool
    pii_masked: bool

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: str
    title: str

    class Config:
        from_attributes = True
