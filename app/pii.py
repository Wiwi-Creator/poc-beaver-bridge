import re
from typing import Any

_RULES: list[tuple[re.Pattern, Any]] = [
    # Email: mask local part, keep domain
    (
        re.compile(r'[a-zA-Z0-9._%+\-]+@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})'),
        lambda m: f"****@{m.group(1)}",
    ),
    (
        re.compile(r'(?:\+886[-\s]?|0)(9\d{2})[-\s]?(\d{3})[-\s]?(\d{3})'),
        lambda m: f"****-***-{m.group(3)}",
    ),
    (
        re.compile(r'\b(?:\d{4}[-\s]?){3}(\d{4})\b'),
        lambda m: f"****-****-****-{m.group(1)}",
    ),
    (
        re.compile(r'\b([A-Z])[12](\d{4})(\d{4})\b'),
        lambda m: f"{m.group(1)}***-**-****",
    ),
]


def mask_text(text: str) -> str:
    for pattern, replacer in _RULES:
        text = pattern.sub(replacer, text)
    return text


def mask_content(content: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Scan tool call response content and mask any detected PII."""
    masked = []
    for item in content:
        if item.get("type") == "text" and isinstance(item.get("text"), str):
            item = {**item, "text": mask_text(item["text"])}
        masked.append(item)
    return masked
