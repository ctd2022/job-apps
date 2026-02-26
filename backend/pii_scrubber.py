"""
PII Scrubber — strips employer names and personal info from CV text before
LLM calls, then re-injects them into the response.

Design:
- Employer placeholder: [COMPANY_42]  (42 = job_history.id)
- Personal placeholders: [CANDIDATE_NAME], [CANDIDATE_EMAIL],
  [CANDIDATE_PHONE], [CANDIDATE_LOCATION]
- No-op if profile is None/empty and job_history is empty.
- Uses exact string replacement (not regex) for safety.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ScrubResult:
    scrubbed_text: str
    replacements: dict[str, str] = field(default_factory=dict)  # placeholder → original


def scrub(
    cv_text: str,
    profile: dict[str, Any] | None,
    job_history: list[dict[str, Any]],
) -> ScrubResult:
    """Replace employer names and personal info with placeholders.

    Returns a ScrubResult containing the scrubbed text and a map of
    placeholder → original value for restoration after LLM response.
    """
    replacements: dict[str, str] = {}
    text = cv_text

    # --- Personal info ---
    if profile:
        personal_fields = [
            ("full_name", "[CANDIDATE_NAME]"),
            ("email", "[CANDIDATE_EMAIL]"),
            ("phone", "[CANDIDATE_PHONE]"),
            ("location", "[CANDIDATE_LOCATION]"),
        ]
        for field_name, placeholder in personal_fields:
            value = profile.get(field_name)
            if value and value.strip() and value.strip() in text:
                text = text.replace(value.strip(), placeholder)
                replacements[placeholder] = value.strip()

    # --- Employer names ---
    for job in job_history:
        employer = (job.get("employer") or "").strip()
        if not employer:
            continue
        placeholder = f"[COMPANY_{job['id']}]"
        if employer in text:
            text = text.replace(employer, placeholder)
            replacements[placeholder] = employer

    return ScrubResult(scrubbed_text=text, replacements=replacements)


def restore(text: str, replacements: dict[str, str]) -> str:
    """Re-inject original values into LLM output."""
    for placeholder, original in replacements.items():
        text = text.replace(placeholder, original)
    return text
