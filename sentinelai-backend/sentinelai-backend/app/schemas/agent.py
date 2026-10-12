from typing import Optional

from pydantic import BaseModel, Field


class AgentCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    system_prompt: str
    allowed_tools: list[str]
    require_approval: bool = True


class AgentOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    system_prompt: str
    allowed_tools: list[str]
    require_approval: bool
    is_active: bool

    class Config:
        from_attributes = True


class AgentRunRequest(BaseModel):
    agent_id: str
    input_text: str = Field(min_length=1, max_length=8000)


class ApprovalDecisionRequest(BaseModel):
    approve: bool
    reason: Optional[str] = None


class AgentRunOut(BaseModel):
    id: str
    agent_id: str
    status: str
    input_text: str
    final_output: Optional[str]

    class Config:
        from_attributes = True
