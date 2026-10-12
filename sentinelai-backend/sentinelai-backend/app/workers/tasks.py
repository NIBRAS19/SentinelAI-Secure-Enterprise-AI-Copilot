"""
Celery task used when PROCESS_DOCUMENTS_INLINE=false. Each task opens its
own DB session and event loop since Celery workers run tasks in separate
sync worker processes/threads, not inside FastAPI's event loop.
"""
import asyncio

from app.core.database import AsyncSessionLocal
from app.services import document_service
from app.workers.celery_app import celery_app


@celery_app.task(name="process_document_task")
def process_document_task(document_id: str, organization_id: str) -> None:
    asyncio.run(_run(document_id, organization_id))


async def _run(document_id: str, organization_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await document_service.process_document(db, document_id=document_id, organization_id=organization_id)
        await db.commit()
