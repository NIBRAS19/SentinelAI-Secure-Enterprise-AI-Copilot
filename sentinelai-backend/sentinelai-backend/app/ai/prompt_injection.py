"""
Prompt-injection detection against untrusted text: document content being
ingested, and user chat messages before they reach the LLM.

This is intentionally a pattern-matching heuristic, not a guarantee — it
catches the common "ignore your instructions" style of attack, which is
sufficient to demonstrate the quarantine pipeline, but a production
deployment should layer this with model-based classification too.
"""
import re
from dataclasses import dataclass, field

_PATTERNS = [
    r"ignore (all|any|previous|prior|the above)[\w\s]{0,30}(instructions|prompts?|rules)",
    r"disregard (all|any|previous|prior|the above)",
    r"you are now (in |)(developer|admin|dan|unrestricted) mode",
    r"forget (all|any|everything) (you (were|have been) told|previous instructions)",
    r"reveal (your|the) (system prompt|instructions)",
    r"act as (if you (are|were)|an?) (unrestricted|jailbroken|uncensored)",
    r"new instructions?:",
    r"\bsystem\s*:\s*override",
    r"do not (follow|obey|comply with) (your|the) (safety|security) (rules|guidelines)",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _PATTERNS]


@dataclass
class InjectionScanResult:
    status: str  # "CLEAN" | "SUSPICIOUS"
    matched_patterns: list[str] = field(default_factory=list)  # regex source, for audit "details"
    matched_snippets: list[str] = field(default_factory=list)  # actual locatable substrings from the text

    @property
    def is_suspicious(self) -> bool:
        return self.status == "SUSPICIOUS"


def scan_for_prompt_injection(text: str) -> InjectionScanResult:
    matched_patterns: list[str] = []
    matched_snippets: list[str] = []

    for pattern in _COMPILED:
        m = pattern.search(text)
        if m:
            matched_patterns.append(pattern.pattern)
            matched_snippets.append(m.group(0))

    status = "SUSPICIOUS" if matched_patterns else "CLEAN"
    return InjectionScanResult(status=status, matched_patterns=matched_patterns, matched_snippets=matched_snippets)
