"""
Reranking compensates for the weak hash embedder by blending vector
similarity with lexical term-coverage: how much of the query's meaningful
vocabulary actually appears in the candidate chunk, IDF-weighted so rare,
distinctive query terms (e.g. "reimbursement") count far more than common
ones (e.g. "policy"), with prefix matching for terms of 4+ characters so
"approve"/"approval"/"approved" still count as a match against each other.
"""
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.ai.text import content_terms

_VECTOR_WEIGHT = 0.35
_COVERAGE_WEIGHT = 0.65
_PREFIX_MIN_LEN = 4
_PREFIX_MATCH_LEN = 4


@dataclass
class RankableCandidate:
    key: str
    content: str
    vector_score: float  # cosine similarity, rescaled to [0, 1]


class Reranker(ABC):
    @abstractmethod
    def rerank(self, query: str, candidates: list[RankableCandidate]) -> list[tuple[str, float]]:
        """Returns (key, final_score) pairs, sorted best-first."""
        ...


def _term_matches(query_term: str, doc_terms_set: set[str]) -> bool:
    if query_term in doc_terms_set:
        return True
    if len(query_term) >= _PREFIX_MIN_LEN:
        prefix = query_term[:_PREFIX_MATCH_LEN]
        return any(dt.startswith(prefix) for dt in doc_terms_set if len(dt) >= _PREFIX_MIN_LEN)
    return False


class LexicalReranker(Reranker):
    def rerank(self, query: str, candidates: list[RankableCandidate]) -> list[tuple[str, float]]:
        query_terms = content_terms(query)
        if not query_terms or not candidates:
            return sorted(
                ((c.key, max(0.0, min(1.0, c.vector_score))) for c in candidates),
                key=lambda kv: kv[1],
                reverse=True,
            )

        # Document frequency across this candidate pool, for IDF weighting.
        doc_term_sets = [set(content_terms(c.content)) for c in candidates]
        n_docs = len(candidates)
        df: dict[str, int] = {}
        for term in set(query_terms):
            df[term] = sum(1 for terms in doc_term_sets if _term_matches(term, terms))

        idf = {term: math.log((n_docs + 1) / (df[term] + 1)) + 1.0 for term in df}
        total_weight = sum(idf[t] for t in query_terms) or 1.0

        results = []
        for candidate, terms in zip(candidates, doc_term_sets):
            matched_weight = sum(idf[t] for t in query_terms if _term_matches(t, terms))
            coverage = matched_weight / total_weight
            vector_component = max(0.0, min(1.0, candidate.vector_score))
            final_score = _VECTOR_WEIGHT * vector_component + _COVERAGE_WEIGHT * coverage
            results.append((candidate.key, final_score))

        return sorted(results, key=lambda kv: kv[1], reverse=True)


class PassthroughReranker(Reranker):
    """Used when a real embedding provider already produces high-quality vector scores."""

    def rerank(self, query: str, candidates: list[RankableCandidate]) -> list[tuple[str, float]]:
        return sorted(
            ((c.key, max(0.0, min(1.0, c.vector_score))) for c in candidates),
            key=lambda kv: kv[1],
            reverse=True,
        )


def get_reranker() -> Reranker:
    from app.core.config import get_settings

    settings = get_settings()
    if settings.reranker_provider == "passthrough":
        return PassthroughReranker()
    return LexicalReranker()
