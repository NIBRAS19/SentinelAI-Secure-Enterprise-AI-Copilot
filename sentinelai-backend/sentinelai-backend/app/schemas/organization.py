from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.auth import MemberOut


class OrganizationOut(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool

    class Config:
        from_attributes = True


class InviteMemberRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: str
    temporary_password: str = Field(min_length=8, max_length=255)


class UpdateMemberRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None


class MemberListOut(BaseModel):
    items: list[MemberOut]
