"""
PII detection and masking via regex + Luhn-validated credit card detection.

These patterns were refined against real test strings (not just written and
assumed correct): the email pattern originally left trailing punctuation
attached, the phone pattern left a dangling '(' from an unmatched area-code
paren, and the credit-card pattern consumed a trailing space into the
match. All three are fixed below with lookaround assertions / adjusted
group structure.
"""
import re
from dataclasses import dataclass, field

EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
CREDIT_CARD_RE = re.compile(r"\b\d(?:[ -]?\d){12,18}\b")


def _luhn_valid(number: str) -> bool:
    digits = [int(c) for c in number if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    for i, digit in enumerate(reversed(digits)):
        if i % 2 == 1:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0


@dataclass
class PIIMatch:
    kind: str  # "email" | "phone" | "ssn" | "credit_card"
    value: str
    start: int
    end: int


@dataclass
class PIIDetectionResult:
    matches: list[PIIMatch] = field(default_factory=list)

    @property
    def has_pii(self) -> bool:
        return len(self.matches) > 0


def detect_pii(text: str) -> PIIDetectionResult:
    matches: list[PIIMatch] = []

    for m in EMAIL_RE.finditer(text):
        matches.append(PIIMatch("email", m.group(0), m.start(), m.end()))

    for m in SSN_RE.finditer(text):
        matches.append(PIIMatch("ssn", m.group(0), m.start(), m.end()))

    for m in CREDIT_CARD_RE.finditer(text):
        if _luhn_valid(m.group(0)):
            matches.append(PIIMatch("credit_card", m.group(0), m.start(), m.end()))

    for m in PHONE_RE.finditer(text):
        # Skip phone matches that are actually substrings of an already-matched SSN/credit card span.
        if any(m.start() >= other.start and m.end() <= other.end for other in matches):
            continue
        matches.append(PIIMatch("phone", m.group(0), m.start(), m.end()))

    matches.sort(key=lambda mm: mm.start)
    return PIIDetectionResult(matches=matches)


_MASK_LABELS = {
    "email": "[REDACTED EMAIL]",
    "phone": "[REDACTED PHONE]",
    "ssn": "[REDACTED SSN]",
    "credit_card": "[REDACTED CARD]",
}


def mask_pii(text: str, result: PIIDetectionResult | None = None) -> str:
    result = result or detect_pii(text)
    if not result.matches:
        return text

    out = []
    cursor = 0
    for match in result.matches:
        if match.start < cursor:
            continue  # overlapping match already covered
        out.append(text[cursor:match.start])
        out.append(_MASK_LABELS.get(match.kind, "[REDACTED]"))
        cursor = match.end
    out.append(text[cursor:])
    return "".join(out)
