"""
Seeds a demo organization with realistic content, run through the REAL
ingestion pipeline (not pre-baked rows): renders each document to actual
PDF/DOCX/text bytes, uploads it through document_service.create_document(),
and processes it through document_service.process_document() so chunking,
embedding, and prompt-injection scanning all genuinely run — the vendor
contract ends up SUSPICIOUS because the real scanner found the injected
sentence, not because a flag was set by hand.

Run with:  python -m scripts.seed
Requires DATABASE_URL to point at a running Postgres with pgvector, and
the schema already migrated (`alembic upgrade head`).
"""
import asyncio
import io
import xml.sax.saxutils as saxutils

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.agent import Agent
from app.models.approval_request import ApprovalRequest
from app.models.agent_run import AgentRun, AgentRunStep
from app.models.collection import Collection
from app.models.member import Member
from app.models.organization import Organization
from app.models.security_policy import SecurityPolicy
from app.services import chat_service, document_service
from scripts.seed_content import COLLECTIONS, DEMO_PASSWORD, DEMO_USERS, DOCUMENTS


def _render_pdf(content: str) -> bytes:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER)
    styles = getSampleStyleSheet()
    flow = []
    for para in content.split("\n\n"):
        escaped = saxutils.escape(para).replace("\n", "<br/>")
        flow.append(Paragraph(escaped, styles["Normal"]))
        flow.append(Spacer(1, 12))
    doc.build(flow)
    return buf.getvalue()


def _render_docx(content: str) -> bytes:
    import docx

    document = docx.Document()
    for para in content.split("\n\n"):
        document.add_paragraph(para)
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


def _render_bytes(fmt: str, content: str) -> tuple[bytes, str]:
    if fmt == "pdf":
        return _render_pdf(content), "application/pdf"
    if fmt == "docx":
        return _render_docx(content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return content.encode("utf-8"), "text/markdown"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        org = Organization(name="Acme Learning & Consulting", slug="acme-learning-consulting")
        db.add(org)
        await db.flush()
        db.add(SecurityPolicy(organization_id=org.id))

        members: dict[str, Member] = {}
        for email, full_name, role in DEMO_USERS:
            member = Member(
                organization_id=org.id, email=email, full_name=full_name,
                password_hash=hash_password(DEMO_PASSWORD), role=role, is_active=True,
            )
            db.add(member)
            members[role] = members.get(role, member)  # keep first member of each role handy
            members[email] = member
        await db.flush()

        collections: dict[str, Collection] = {}
        for name, description in COLLECTIONS:
            col = Collection(organization_id=org.id, name=name, description=description)
            db.add(col)
            collections[name] = col
        await db.flush()
        await db.commit()

        owner = members["org_owner"]

        print(f"Created organization '{org.name}' (slug={org.slug}) with {len(DEMO_USERS)} members.")

        for filename, fmt, collection_name, access_roles, content in DOCUMENTS:
            data, mime_type = _render_bytes(fmt, content)
            async with AsyncSessionLocal() as db:
                document = await document_service.create_document(
                    db,
                    organization_id=org.id,
                    uploaded_by_id=owner.id,
                    collection_id=collections[collection_name].id,
                    name=filename,
                    mime_type=mime_type,
                    data=data,
                )
                if access_roles:
                    document.access_roles = access_roles
                await db.commit()

            async with AsyncSessionLocal() as db:
                await document_service.process_document(db, document_id=document.id, organization_id=org.id)
                await db.commit()
            print(f"  ingested {filename} -> status will reflect real scan results")

        # One real chat message, exercised through the actual pipeline.
        async with AsyncSessionLocal() as db:
            member_id = members["member1@acme-demo.com"].id
            msg = await chat_service.send_message(
                db,
                organization_id=org.id,
                member_id=member_id,
                role="member",
                conversation_id=None,
                content="How do I get reimbursed for travel expenses?",
            )
            await db.commit()
            print(f"Seeded one chat exchange. Assistant replied with {len(msg.content)} characters.")

        # Three demo agents.
        async with AsyncSessionLocal() as db:
            agents = [
                Agent(
                    organization_id=org.id, name="Knowledge Assistant",
                    description="Answers questions using the permission-aware knowledge base.",
                    system_prompt="You answer employee questions using only the retrieved knowledge base content.",
                    allowed_tools=["knowledge_search", "calculator"], require_approval=False,
                ),
                Agent(
                    organization_id=org.id, name="CRM Helper",
                    description="Looks up account info in the CRM (simulated).",
                    system_prompt="You help sales reps look up account status.",
                    allowed_tools=["crm_lookup", "knowledge_search"], require_approval=True,
                ),
                Agent(
                    organization_id=org.id, name="Integration Agent",
                    description="Calls external APIs on request (simulated, always requires approval).",
                    system_prompt="You call external systems on behalf of the requester.",
                    allowed_tools=["http_api"], require_approval=True,
                ),
            ]
            for a in agents:
                db.add(a)
            await db.flush()
            await db.commit()
            print(f"Created {len(agents)} demo agents.")

            # One completed run (Knowledge Assistant, low-risk tool, no approval needed).
            run1 = AgentRun(
                organization_id=org.id, agent_id=agents[0].id, triggered_by_id=members["manager@acme-demo.com"].id,
                input_text="What's the on-call escalation process?", status="COMPLETED",
                final_output="See the On-Call Engineer Guide: page within 15 minutes, escalate SEV1 to the incident commander.",
            )
            db.add(run1)
            await db.flush()
            db.add(AgentRunStep(
                organization_id=org.id, agent_run_id=run1.id, step_index=0, step_type="tool_call",
                tool_name="knowledge_search", tool_input={"query": "on-call escalation process"},
                tool_output={"results": [{"document_name": "On-Call Guide.md"}]},
            ))

            # One pending approval (CRM Helper, medium-risk tool, approval required).
            run2 = AgentRun(
                organization_id=org.id, agent_id=agents[1].id, triggered_by_id=members["manager2@acme-demo.com"].id,
                input_text="Look up the Initech account status.", status="AWAITING_APPROVAL",
            )
            db.add(run2)
            await db.flush()
            step2 = AgentRunStep(
                organization_id=org.id, agent_run_id=run2.id, step_index=0, step_type="tool_call",
                tool_name="crm_lookup", tool_input={"account_name": "Initech"},
            )
            db.add(step2)
            await db.flush()
            db.add(ApprovalRequest(
                organization_id=org.id, agent_run_id=run2.id, agent_run_step_id=step2.id,
                tool_name="crm_lookup", tool_input={"account_name": "Initech"}, risk_level="medium", status="PENDING",
            ))
            await db.flush()
            await db.commit()
            print("Created 1 completed agent run and 1 pending approval request.")

        print("\nSeed complete. Demo login (any user above) uses password:", DEMO_PASSWORD)
        print("Try: owner@acme-demo.com / security@acme-demo.com / member1@acme-demo.com")


if __name__ == "__main__":
    asyncio.run(seed())
