"""
api/sanitizers.py
Input sanitization utilities for SisterCircle+.
Cleans all user-supplied text before it reaches the Claude prompt or database.
"""

import re
import html


# Tags / attributes that must never reach the prompt or DB
_STRIP_TAGS = re.compile(r"<[^>]+>", re.IGNORECASE)
_SCRIPT_BLOCK = re.compile(
    r"<script[\s\S]*?</script>|javascript\s*:|on\w+\s*=",
    re.IGNORECASE,
)
_PROMPT_INJECTION = re.compile(
    r"(ignore previous|ignore all|system:|assistant:|user:|<\|im_start\|>|<\|im_end\|>|\[\[|\]\])",
    re.IGNORECASE,
)


def strip_html(value: str) -> str:
    """Remove all HTML tags and unescape HTML entities."""
    if not isinstance(value, str):
        return ""
    value = _STRIP_TAGS.sub("", value)
    value = html.unescape(value)
    return value.strip()


def sanitize_text(value: str, max_length: int = 500) -> str:
    """
    Full sanitization for free-text fields:
    - Strip HTML tags
    - Remove script injection attempts
    - Remove prompt-injection patterns
    - Truncate to max_length
    """
    if not isinstance(value, str):
        return ""
    value = _SCRIPT_BLOCK.sub("", value)
    value = strip_html(value)
    value = _PROMPT_INJECTION.sub("[removed]", value)
    # Collapse excessive whitespace
    value = re.sub(r"\s+", " ", value).strip()
    return value[:max_length]


def sanitize_age(value) -> int | None:
    """
    Validate age is an integer between 10 and 80.
    Returns None if invalid — callers should reject or default.
    """
    try:
        age = int(value)
    except (TypeError, ValueError):
        return None
    if not (10 <= age <= 80):
        return None
    return age


def sanitize_symptom_list(value) -> list[str]:
    """
    Validate and sanitize a list of symptom strings.
    - Must be a list
    - Each item stripped of HTML, max 100 chars
    - Max 20 items total
    """
    if not isinstance(value, list):
        return []
    cleaned = []
    for item in value[:20]:
        if isinstance(item, str):
            safe = sanitize_text(item, max_length=100)
            if safe:
                cleaned.append(safe)
    return cleaned


def sanitize_symptom_payload(data: dict) -> dict:
    """
    Sanitize the full symptom submission payload from the frontend.
    Returns a new dict with all values cleaned.
    """
    age = sanitize_age(data.get("age"))

    return {
        "age":              age,
        "location":         sanitize_text(str(data.get("location", "")), 100),
        "user_type":        sanitize_text(str(data.get("user_type", "Patient")), 50),
        "last_period":      str(data.get("last_period", ""))[:10] or None,
        "cycle_length":     sanitize_text(str(data.get("cycle_length", "")), 50),
        "cycle_regularity": sanitize_text(str(data.get("cycle_regularity", "")), 50),
        "bleeding_volume":  sanitize_text(str(data.get("bleeding_volume", "")), 50),
        "bleeding_days":    sanitize_text(str(data.get("bleeding_days", "")), 30),
        "pain_level":       _clamp_pain(data.get("pain_level", 0)),
        "symptoms":         sanitize_symptom_list(data.get("symptoms", [])),
        "other_symptoms":   sanitize_text(str(data.get("other_symptoms", "")), 500),
    }


def _clamp_pain(value) -> int:
    try:
        return max(0, min(10, int(value)))
    except (TypeError, ValueError):
        return 0
