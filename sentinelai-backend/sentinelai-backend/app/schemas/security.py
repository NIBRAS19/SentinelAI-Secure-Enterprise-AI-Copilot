from typing import Optional

from pydantic import BaseModel


class SecurityPolicyOut(BaseModel):
    pii_masking_enabled: bool
    prompt_injection_detection_enabled: bool
    require_agent_approval: bool
    min_retrieval_score_override: Optional[str]

    class Config:
        from_attributes = True


class SecurityPolicyUpdateRequest(BaseModel):
    pii_masking_enabled: Optional[bool] = None
    prompt_injection_detection_enabled: Optional[bool] = None
    require_agent_approval: Optional[bool] = None
    min_retrieval_score_override: Optional[str] = None


class AuditLogOut(BaseModel):
    id: str
    actor_label: str
    action: str
    resource_type: str
    resource_id: Optional[str]
    severity: str
    details: Optional[dict]

    class Config:
        from_attributes = True
