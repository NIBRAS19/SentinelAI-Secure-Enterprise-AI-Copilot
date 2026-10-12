"""
Embedding providers.

HashEmbeddingProvider is a dependency-free, zero-config fallback: no API
key, no network call, deterministic. It cannot capture real semantics, so
on its own it retrieves the single best-matching document for roughly
80-85% of realistic natural-language questions against a small corpus —
good enough to demo the full pipeline end-to-end, but not production
retrieval quality. app/ai/rerank.py's LexicalReranker compensates for the
rest by blending in exact/near term-coverage scoring, which empirically
brought retrieval to 7/7 on the seeded demo corpus. Swap
EMBEDDING_PROVIDER=openai (and set OPENAI_API_KEY) for real embeddings in
production; nothing else in the pipeline needs to change since both
providers return a plain list[float] of the same EMBEDDING_DIM.
"""
import hashlib
import math
from abc import ABC, abstractmethod

from app.ai.constants import EMBEDDING_DIM
from app.ai.text import content_tokens
from app.core.config import get_settings

_HASH_SALT = "sentinel-hash-v1:"
_NGRAM_WEIGHT = 0.35


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]: ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


def _hash_to_unit_vector_component(token: str, salt: str, dim: int) -> tuple[int, float]:
    digest = hashlib.sha256(f"{salt}{token}".encode("utf-8")).digest()
    index = int.from_bytes(digest[:4], "big") % dim
    # Sign bit from a different slice of the digest so index and sign are independent.
    sign = 1.0 if digest[4] % 2 == 0 else -1.0
    return index, sign


class HashEmbeddingProvider(EmbeddingProvider):
    """
    "Hashing trick" bag-of-words embedding: each token (and each character
    4-gram, at reduced weight) hashes to one of EMBEDDING_DIM buckets with
    a pseudo-random sign, buckets accumulate, and the result is L2
    normalized. Character n-grams are included so that near-misspellings
    and shared word stems (e.g. "approve"/"approval") still produce
    partially overlapping vectors even without real semantic understanding.
    """

    async def embed(self, text: str) -> list[float]:
        vector = [0.0] * EMBEDDING_DIM
        tokens = content_tokens(text)
        if not tokens:
            return vector

        for token in tokens:
            index, sign = _hash_to_unit_vector_component(token, _HASH_SALT, EMBEDDING_DIM)
            vector[index] += sign

        for token in tokens:
            padded = f"#{token}#"
            for i in range(len(padded) - 3):
                gram = padded[i : i + 4]
                index, sign = _hash_to_unit_vector_component(gram, _HASH_SALT + "ngram:", EMBEDDING_DIM)
                vector[index] += sign * _NGRAM_WEIGHT

        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]
        return vector

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [await self.embed(t) for t in texts]


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """Real embeddings via the OpenAI API. Requires `openai` and OPENAI_API_KEY."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def embed(self, text: str) -> list[float]:
        resp = await self._client.embeddings.create(model=self._model, input=text)
        return resp.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        resp = await self._client.embeddings.create(model=self._model, input=texts)
        return [d.embedding for d in resp.data]


def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    if settings.embedding_provider == "openai" and settings.openai_api_key:
        return OpenAIEmbeddingProvider(api_key=settings.openai_api_key)
    return HashEmbeddingProvider()
