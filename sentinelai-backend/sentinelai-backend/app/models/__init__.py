"""
Import every model module here so Alembic's autogenerate and
`Base.metadata.create_all()` (used by tests) see the full schema.
"""
from app.models.organization import Organization  # noqa: F401
from app.models.member import Member  # noqa: F401
from app.models.session import Session  # noqa: F401
from app.models.collection import Collection  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.chunk import Chunk  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.agent import Agent  # noqa: F401
from app.models.agent_run import AgentRun, AgentRunStep  # noqa: F401
from app.models.approval_request import ApprovalRequest  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.usage_event import UsageEvent  # noqa: F401
from app.models.security_policy import SecurityPolicy  # noqa: F401
