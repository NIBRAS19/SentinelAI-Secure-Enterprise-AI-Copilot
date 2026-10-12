"""Shared text utilities: whitespace normalization, chunking, tokenization."""
import re

_WS_RE = re.compile(r"[ \t]+")
_HYPHEN_LINEBREAK_RE = re.compile(r"(\w)-\n(\w)")
# A single newline that isn't followed by another newline (i.e. not a paragraph
# break) is almost always a PDF hard-wrap artifact, not an intentional break.
_SOFT_LINEBREAK_RE = re.compile(r"(?<!\n)\n(?!\n)")
_MULTI_BLANK_RE = re.compile(r"\n{3,}")

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "for", "with",
    "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those",
    "it", "its", "as", "at", "by", "from", "has", "have", "had", "i", "you", "we", "they",
    "will", "can", "do", "does", "did", "not", "no", "so", "what", "which", "who", "when",
    "where", "how", "why", "me", "my", "our", "your", "their",
}


def normalize_whitespace(text: str) -> str:
    """
    Rejoin PDF hard-wrapped lines. PDF text extraction frequently inserts a
    newline wherever the original layout wrapped a line, even mid-sentence,
    and sometimes splits a hyphenated word across the break. Collapsing
    those (while preserving genuine paragraph breaks, i.e. blank lines)
    makes chunk boundaries fall on sentence/paragraph lines instead of
    arbitrary mid-word points.
    """
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _HYPHEN_LINEBREAK_RE.sub(r"\1\2", text)
    text = _SOFT_LINEBREAK_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    text = _MULTI_BLANK_RE.sub("\n\n", text)
    return text.strip()


def chunk_text(text: str, *, max_chars: int = 1200, overlap_chars: int = 150) -> list[str]:
    """
    Paragraph-aware sliding-window chunking: accumulate paragraphs until
    adding the next would exceed max_chars, then start a new chunk that
    begins with the trailing `overlap_chars` of the previous chunk (so a
    fact that straddles a chunk boundary is still fully present in at
    least one chunk).
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) <= max_chars or not current:
            current = candidate
        else:
            chunks.append(current.strip())
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = f"{tail}\n\n{para}" if tail else para
    if current.strip():
        chunks.append(current.strip())

    # A single paragraph longer than max_chars still needs hard splitting.
    final: list[str] = []
    for c in chunks:
        if len(c) <= max_chars * 1.5:
            final.append(c)
        else:
            for i in range(0, len(c), max_chars - overlap_chars):
                piece = c[i : i + max_chars]
                if piece.strip():
                    final.append(piece.strip())
    return final


def normalize_term(term: str) -> str:
    return term.lower().strip(".,;:!?\"'()[]{}")


def content_tokens(text: str) -> list[str]:
    """Lowercased alphanumeric tokens, punctuation stripped."""
    return re.findall(r"[a-zA-Z0-9]+", text.lower())


def content_terms(text: str) -> list[str]:
    """content_tokens() with stopwords and single characters removed — used for IDF/coverage scoring."""
    return [t for t in content_tokens(text) if t not in _STOPWORDS and len(t) > 1]
