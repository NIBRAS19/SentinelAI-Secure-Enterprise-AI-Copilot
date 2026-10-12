from typing import Optional

from pydantic import BaseModel, Field


class DocumentOut(BaseModel):
    id: str
    organization_id: str
    collection_id: Optional[str]
    name: str
    mime_type: str
    size_bytes: int
    status: str
    security_status: str
    error_message: Optional[str]
    access_roles: Optional[list[str]]
    page_count: Optional[int]
    chunk_count: int

    class Config:
        from_attributes = True


class DocumentUpdateRequest(BaseModel):
    collection_id: Optional[str] = None
    access_roles: Optional[list[str]] = None


class CollectionCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None


class CollectionOut(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True
