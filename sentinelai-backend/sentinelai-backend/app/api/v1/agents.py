from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.database import get_db
from app.models.agent import Agent
from app.models.approval_request import ApprovalRequest
from app.schemas.agent import (
    AgentCreateRequest,
    AgentOut,
    AgentRunOut,
    AgentRunRequest,
    ApprovalDecisionRequest,
)
from app.services import agent_service

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentOut, status_code=201)
async def create_agent(
    payload: AgentCreateRequest, current: CurrentMember = Depends(require("agents.manage")), db: AsyncSession = Depends(get_db)
):
    agent = Agent(
        organization_id=current.organization_id,
        name=payload.name,
        description=payload.description,
        system_prompt=payload.system_prompt,
        allowed_tools=payload.allowed_tools,
        require_approval=payload.require_approval,
    )
    db.add(agent)
    await db.flush()
    await db.commit()
    return AgentOut.model_validate(agent)


@router.get("", response_model=list[AgentOut])
async def list_agents(current: CurrentMember = Depends(require("agents.manage")), db: AsyncSession = Depends(get_db)):
    stmt = select(Agent).where(Agent.organization_id == current.organization_id)
    rows = (await db.execute(stmt)).scalars().all()
    return [AgentOut.model_validate(a) for a in rows]


@router.post("/runs", response_model=AgentRunOut, status_code=201)
async def create_run(
    payload: AgentRunRequest, current: CurrentMember = Depends(require("agents.manage")), db: AsyncSession = Depends(get_db)
):
    # Demo-scope simplification: the tool name/input is inferred as "knowledge_search"
    # over the input text. A production planner would use the LLM to choose the tool.
    run = await agent_service.run_agent(
        db,
        organization_id=current.organization_id,
        triggered_by_id=current.id,
        agent_id=payload.agent_id,
        input_text=payload.input_text,
        tool_name="knowledge_search",
        tool_input={"query": payload.input_text},
    )
    await db.commit()
    return AgentRunOut.model_validate(run)


@router.get("/approvals/pending")
async def list_pending_approvals(
    current: CurrentMember = Depends(require("agents.approve")), db: AsyncSession = Depends(get_db)
):
    stmt = select(ApprovalRequest).where(
        ApprovalRequest.organization_id == current.organization_id, ApprovalRequest.status == "PENDING"
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": a.id, "agent_run_id": a.agent_run_id, "tool_name": a.tool_name,
            "tool_input": a.tool_input, "risk_level": a.risk_level,
        }
        for a in rows
    ]


@router.post("/approvals/{approval_id}/decide")
async def decide_approval(
    approval_id: str,
    payload: ApprovalDecisionRequest,
    current: CurrentMember = Depends(require("agents.approve")),
    db: AsyncSession = Depends(get_db),
):
    approval = await agent_service.resolve_approval(
        db,
        organization_id=current.organization_id,
        approval_id=approval_id,
        decided_by_id=current.id,
        approve=payload.approve,
        reason=payload.reason,
    )
    await db.commit()
    return {"id": approval.id, "status": approval.status}
