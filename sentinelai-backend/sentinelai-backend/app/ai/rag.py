"""
Permission-aware retrieval pipeline:

    tenant filter -> permission filter -> vector search -> rerank -> relevance threshold

This is deliberately NOT "query -> vector search -> LLM". Every step before
the LLM ever sees a chunk is a filter that can only remove candidates, never
add ones the tenant/role shouldn't see:

  1. Tenant filter: the vector query itself is scoped to organization_id
     (and implicitly excludes chunks with embedding IS NULL, i.e. any
     quarantined SUSPICIOUS document — see models/chunk.py).
  2. Permission filter: candidates are split into authorized/denied by
     can_access_document() against each chunk's parent document's
     access_roles, BEFORE reranking or scoring ever happens.
  3. Vector search already ran as step 0 to produce the candidate pool.
  4. Rerank: the lexical reranker re-scores the authorized pool.
  5. Relevance threshold: candidates below retrieval_min_score are dropped,
     so an irrelevant-but-technically-highest-scoring chunk doesn't get
     treated as a real answer.

`had_unauthorized_match` is computed by independently reranking the denied
pool (top_k=1) purely to answer "was there a genuinely relevant match this
role isn't allowed to see?" This is kept separate from "the authorized
pool came back empty" because those are different situations: a denial
should log a security event and show a "restricted" badge, while an
off-topic question that matches nothing should not look like an
authorization failure.
"""
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rerank import RankableCandidate, get_reranker
from app.core.config import get_settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.policies.rbac import can_access_document


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    page_number: int | None
    score: float


@dataclass
class RetrievalResult:
    chunks: list[RetrievedChunk] = field(default_factory=list)
    had_unauthorized_match: bool = False  # True only on a genuine permission denial, never on an off-topic query


def _rescale_cosine(distance: float) -> float:
    """pgvector's cosine_distance is 1 - cosine_similarity; rescale distance to a [0,1] "goodness" score."""
    similarity = 1.0 - distance
    return max(0.0, min(1.0, (similarity + 1.0) / 2.0))


async def retrieve_relevant_chunks(
    db: AsyncSession,
    *,
    organization_id: str,
    role: str,
    query: str,
    query_embedding: list[float],
    top_k: int | None = None,
    min_score: float | None = None,
) -> RetrievalResult:
    settings = get_settings()
    top_k = top_k or settings.retrieval_top_k
    min_score = settings.retrieval_min_score if min_score is None else min_score
    pool_size = settings.retrieval_candidate_pool

    # Step 0 + 1 (tenant filter): vector search scoped to this organization.
    # Chunk.embedding IS NULL is automatically excluded by cosine_distance ordering
    # over a nullable vector column in practice we filter explicitly to be safe.
    stmt = (
        select(Chunk, Document)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.organization_id == organization_id)
        .where(Chunk.embedding.isnot(None))
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(pool_size)
    )
    rows = (await db.execute(stmt)).all()

    authorized_candidates: list[RankableCandidate] = []
    authorized_meta: dict[str, tuple[Chunk, Document, float]] = {}
    denied_candidates: list[RankableCandidate] = []
    denied_meta: dict[str, tuple[Chunk, Document, float]] = {}

    for chunk, document in rows:
        distance = getattr(chunk, "_cosine_distance", None)
        # SQLAlchemy doesn't expose the computed order-by value directly on the
        # ORM object, so we recompute the score from the stored vectors here.
        vector_score = _cosine_score(query_embedding, chunk.embedding)

        # Step 2 (permission filter): split BEFORE reranking/scoring is used for anything user-facing.
        if can_access_document(role, document.access_roles):
            authorized_candidates.append(RankableCandidate(key=chunk.id, content=chunk.content, vector_score=vector_score))
            authorized_meta[chunk.id] = (chunk, document, vector_score)
        else:
            denied_candidates.append(RankableCandidate(key=chunk.id, content=chunk.content, vector_score=vector_score))
            denied_meta[chunk.id] = (chunk, document, vector_score)

    reranker = get_reranker()

    # Step 4 + 5: rerank the authorized pool, apply the relevance threshold.
    ranked_authorized = reranker.rerank(query, authorized_candidates)[:top_k]
    result_chunks = [
        RetrievedChunk(
            chunk_id=chunk.id,
            document_id=document.id,
            document_name=document.name,
            content=chunk.content,
            page_number=chunk.page_number,
            score=score,
        )
        for chunk_id, score in ranked_authorized
        if score >= min_score
        for chunk, document, _ in [authorized_meta[chunk_id]]
    ]

    # Independently determine whether a genuinely relevant DENIED match exists,
    # so "nothing relevant at all" and "something relevant but not permitted"
    # are never conflated.
    had_unauthorized_match = False
    if denied_candidates:
        ranked_denied = reranker.rerank(query, denied_candidates)[:1]
        if ranked_denied and ranked_denied[0][1] >= min_score:
            had_unauthorized_match = True

    return RetrievalResult(chunks=result_chunks, had_unauthorized_match=had_unauthorized_match)


def _cosine_score(a: list[float], b: list[float] | None) -> float:
    if not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    similarity = dot / (norm_a * norm_b)
    return max(0.0, min(1.0, (similarity + 1.0) / 2.0))
