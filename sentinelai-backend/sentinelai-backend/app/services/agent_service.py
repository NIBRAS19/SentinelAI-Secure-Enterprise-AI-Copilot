"""
Agent execution with a human-in-the-loop approval gate.

requires_approval() jointly considers the AGENT's require_approval flag and
the TOOL's own risk_level: a "low" risk tool (calculator) never pauses even
on a strict agent, a "high" risk tool (http_api) always pauses regardless
of the agent's setting, and a "medium" risk tool (crm_lookup) pauses only
if the agent requires approval. This mirrors the PRD's model of
agent-level policy intersecting with tool-level risk rather than either
one alone deciding.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.tools import get_tool
from app.core.errors import AppError, NotFoundError
from app.models.agent import Agent
from app.models.agent_run import AgentRun, AgentRunStep
from app.models.approval_request import ApprovalRequest
from app.services import audit_service

_ALWAYS_PAUSE_RISK = {"high"}
_NEVER_PAUSE_RISK = {"low"}


def requires_approval(*, agent_require_approval: bool, tool_risk_level: str) -> bool:
    if tool_risk_level in _ALWAYS_PAUSE_RISK:
        return True
    if tool_risk_level in _NEVER_PAUSE_RISK:
        return False
    return agent_require_approval  # "medium" risk defers to the agent's own policy


async def get_agent(db: AsyncSession, *, organization_id: str, agent_id: str) -> Agent:
    agent = (
        await db.execute(select(Agent).where(Agent.id == agent_id, Agent.organization_id == organization_id))
    ).scalar_one_or_none()
    if agent is None:
        raise NotFoundError("Agent not found.")
    return agent


async def run_agent(
    db: AsyncSession, *, organization_id: str, triggered_by_id: str, agent_id: str, input_text: str, tool_name: str, tool_input: dict
) -> AgentRun:
    """
    Simplified single-tool-call run (matches the PRD's demo scope: the
    agent decides to call one tool, which either executes immediately or
    pauses for approval). A production version would loop over multiple
    tool calls via an LLM planning step; this keeps the approval-gating
    logic the same either way.
    """
    agent = await get_agent(db, organization_id=organization_id, agent_id=agent_id)
    if tool_name not in agent.allowed_tools:
        raise AppError(f"Agent is not permitted to use tool '{tool_name}'.", code="TOOL_NOT_ALLOWED", status_code=403)

    tool = get_tool(tool_name)
    if tool is None:
        raise AppError(f"Unknown tool '{tool_name}'.", code="UNKNOWN_TOOL", status_code=400)

    run = AgentRun(
        organization_id=organization_id,
        agent_id=agent_id,
        triggered_by_id=triggered_by_id,
        input_text=input_text,
        status="RUNNING",
    )
    db.add(run)
    await db.flush()

    step = AgentRunStep(
        organization_id=organization_id,
        agent_run_id=run.id,
        step_index=0,
        step_type="tool_call",
        tool_name=tool_name,
        tool_input=tool_input,
    )
    db.add(step)
    await db.flush()

    if requires_approval(agent_require_approval=agent.require_approval, tool_risk_level=tool.risk_level):
        run.status = "AWAITING_APPROVAL"
        approval = ApprovalRequest(
            organization_id=organization_id,
            agent_run_id=run.id,
            agent_run_step_id=step.id,
            tool_name=tool_name,
            tool_input=tool_input,
            risk_level=tool.risk_level,
            status="PENDING",
        )
        db.add(approval)
        await db.flush()
        await audit_service.record_event(
            db,
            organization_id=organization_id,
            actor_id=triggered_by_id,
            actor_label=triggered_by_id,
            action="agent.approval_requested",
            resource_type="agent_run",
            resource_id=run.id,
            severity="INFO",
            details={"tool_name": tool_name, "risk_level": tool.risk_level},
        )
        return run

    output = await tool.executor(tool_input)
    step.tool_output = output
    run.status = "COMPLETED"
    run.final_output = str(output)
    await db.flush()
    return run


async def resolve_approval(
    db: AsyncSession, *, organization_id: str, approval_id: str, decided_by_id: str, approve: bool, reason: str | None
) -> ApprovalRequest:
    approval = (
        await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == approval_id, ApprovalRequest.organization_id == organization_id)
        )
    ).scalar_one_or_none()
    if approval is None:
        raise NotFoundError("Approval request not found.")
    if approval.status != "PENDING":
        raise AppError("This approval request has already been decided.", code="ALREADY_DECIDED", status_code=409)

    run = (await db.execute(select(AgentRun).where(AgentRun.id == approval.agent_run_id))).scalar_one()
    step = (await db.execute(select(AgentRunStep).where(AgentRunStep.id == approval.agent_run_step_id))).scalar_one()

    approval.decided_by_id = decided_by_id
    approval.decision_reason = reason

    if not approve:
        approval.status = "REJECTED"
        run.status = "REJECTED"
        await db.flush()
        await audit_service.record_event(
            db,
            organization_id=organization_id,
            actor_id=decided_by_id,
            actor_label=decided_by_id,
            action="agent.approval_rejected",
            resource_type="agent_run",
            resource_id=run.id,
            severity="INFO",
            details={"reason": reason},
        )
        return approval

    approval.status = "APPROVED"
    tool = get_tool(approval.tool_name)
    output = await tool.executor(approval.tool_input) if tool else {"error": "tool no longer registered"}
    step.tool_output = output
    run.status = "COMPLETED"
    run.final_output = str(output)
    await db.flush()
    await audit_service.record_event(
        db,
        organization_id=organization_id,
        actor_id=decided_by_id,
        actor_label=decided_by_id,
        action="agent.approval_approved",
        resource_type="agent_run",
        resource_id=run.id,
        severity="INFO",
        details={"tool_name": approval.tool_name},
    )
    return approval
