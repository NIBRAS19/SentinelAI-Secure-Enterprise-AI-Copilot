from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentMember, require
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.errors import AppError
from app.schemas.document import CollectionCreateRequest, CollectionOut, DocumentOut, DocumentUpdateRequest
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["documents"])


async def _process_in_background(document_id: str, organization_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await document_service.process_document(db, document_id=document_id, organization_id=organization_id)
        await db.commit()


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_id: str | None = None,
    current: CurrentMember = Depends(require("documents.write")),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    data = await file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise AppError(f"File exceeds the {settings.max_upload_mb}MB upload limit.", code="FILE_TOO_LARGE", status_code=413)

    document = await document_service.create_document(
        db,
        organization_id=current.organization_id,
        uploaded_by_id=current.id,
        collection_id=collection_id,
        name=file.filename or "untitled",
        mime_type=file.content_type or "application/octet-stream",
        data=data,
    )
    await db.commit()

    if settings.process_documents_inline:
        background_tasks.add_task(_process_in_background, document.id, current.organization_id)
    else:
        from app.workers.tasks import process_document_task

        process_document_task.delay(document.id, current.organization_id)

    return DocumentOut.model_validate(document)


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    collection_id: str | None = None,
    current: CurrentMember = Depends(require("documents.read")),
    db: AsyncSession = Depends(get_db),
):
    documents = await document_service.list_documents(db, organization_id=current.organization_id, collection_id=collection_id)
    return [DocumentOut.model_validate(d) for d in documents]


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str, current: CurrentMember = Depends(require("documents.read")), db: AsyncSession = Depends(get_db)
):
    document = await document_service.get_document(db, organization_id=current.organization_id, document_id=document_id)
    return DocumentOut.model_validate(document)


@router.patch("/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: str,
    payload: DocumentUpdateRequest,
    current: CurrentMember = Depends(require("documents.write")),
    db: AsyncSession = Depends(get_db),
):
    # Only pass through fields the client actually set, so omitting a field in
    # the request body leaves it unchanged rather than nulling it out. This
    # relies on Pydantic's own model_fields_set rather than reaching into the
    # service module's private sentinel.
    fields_set = payload.model_fields_set
    optional_kwargs = {}
    if "collection_id" in fields_set:
        optional_kwargs["collection_id"] = payload.collection_id
    if "access_roles" in fields_set:
        optional_kwargs["access_roles"] = payload.access_roles

    document = await document_service.update_document(
        db, organization_id=current.organization_id, document_id=document_id, **optional_kwargs
    )
    await db.commit()
    return DocumentOut.model_validate(document)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str, current: CurrentMember = Depends(require("documents.delete")), db: AsyncSession = Depends(get_db)
):
    await document_service.delete_document(db, organization_id=current.organization_id, document_id=document_id)
    await db.commit()


@router.post("/collections", response_model=CollectionOut, status_code=201)
async def create_collection(
    payload: CollectionCreateRequest, current: CurrentMember = Depends(require("collections.manage")), db: AsyncSession = Depends(get_db)
):
    from app.models.collection import Collection

    collection = Collection(organization_id=current.organization_id, name=payload.name, description=payload.description)
    db.add(collection)
    await db.flush()
    await db.commit()
    return CollectionOut.model_validate(collection)


@router.get("/collections/all", response_model=list[CollectionOut])
async def list_collections(current: CurrentMember = Depends(require("documents.read")), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    from app.models.collection import Collection

    stmt = select(Collection).where(Collection.organization_id == current.organization_id)
    rows = (await db.execute(stmt)).scalars().all()
    return [CollectionOut.model_validate(c) for c in rows]
