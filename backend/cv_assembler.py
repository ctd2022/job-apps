"""
CV Assembler — renders structured job history into CV text and parses it back.

Markers (<!-- JOB:id -->) allow bidirectional sync between the profile DB
and the CV textarea without exposing employer names to LLMs.
"""

import re
from typing import Any


def assemble_experience_section(job_history: list[dict[str, Any]]) -> str:
    """Render structured job history into CV EXPERIENCE section text.

    Each job block begins with a <!-- JOB:id --> comment marker so the
    parser can match edited content back to the correct DB record.
    Employer name is included here (shown to user in textarea); the PII
    scrubber strips it before any LLM call.
    """
    if not job_history:
        return ""

    lines: list[str] = []
    for job in job_history:
        job_id = job["id"]
        title = job.get("title") or ""
        employer = job.get("employer") or ""
        start = job.get("start_date") or ""
        end = job.get("end_date") or ("Present" if job.get("is_current") else "")
        date_range = f"{start} – {end}".strip(" –")
        details = (job.get("details") or "").strip()
        tags = job.get("tags") or []

        lines.append(f"<!-- JOB:{job_id} -->")
        lines.append(f"**{title}** | {employer}")
        if date_range:
            lines.append(date_range)
        if details:
            lines.append(details)
        if tags:
            lines.append(f"Skills: {', '.join(tags)}")
        lines.append("")  # blank separator between jobs

    return "\n".join(lines).rstrip()


def format_contact_header(profile: dict) -> str:
    """Format CandidateProfile personal info as a plain-text CV header block.

    Wrapped in <!-- CONTACT_START --> / <!-- CONTACT_END --> markers so the
    frontend can detect and replace it idempotently on re-pull.
    Returns empty string if no personal info is present.
    """
    name = (profile.get("full_name") or "").strip()
    email = (profile.get("email") or "").strip()
    phone = (profile.get("phone") or "").strip()
    location = (profile.get("location") or "").strip()
    linkedin = re.sub(r"\s+", "", profile.get("linkedin") or "")
    website = re.sub(r"\s+", "", profile.get("website") or "")

    if not any([name, email, phone, location, linkedin, website]):
        return ""

    lines: list[str] = ["<!-- CONTACT_START -->"]
    if name:
        lines.append(name)
    detail_parts = [p for p in [email, phone, location] if p]
    if detail_parts:
        lines.append(" | ".join(detail_parts))
    link_parts = [p for p in [linkedin, website] if p]
    if link_parts:
        lines.append(" | ".join(link_parts))
    lines.append("<!-- CONTACT_END -->")
    return "\n".join(lines)


def parse_experience_section(cv_text: str) -> list[dict[str, Any]]:
    """Extract job updates from CV text containing <!-- JOB:id --> markers.

    Returns a list of dicts with keys:
        id       — job_history.id (int)
        details  — bullet text after the header line (str)
        tags     — skills extracted from the "Skills: ..." line (list[str])

    Only details and tags are extracted. Employer is never parsed back
    (it is the PII boundary — employer stays in the DB only).
    """
    marker_pattern = re.compile(r"<!--\s*JOB:(\d+)\s*-->")
    markers = list(marker_pattern.finditer(cv_text))
    if not markers:
        return []

    updates: list[dict[str, Any]] = []
    for i, match in enumerate(markers):
        job_id = int(match.group(1))
        block_start = match.end()
        block_end = markers[i + 1].start() if i + 1 < len(markers) else len(cv_text)
        block = cv_text[block_start:block_end].strip()

        block_lines = block.split("\n")
        # First line is the "**Title** | Employer" header — skip it
        content_lines = block_lines[1:] if block_lines else []

        # Strip date line (typically "MMM YYYY – MMM YYYY" or "Present")
        date_pattern = re.compile(
            r"^[\w]+ \d{4}|^\d{4}|^Present$|^–|^ *$", re.IGNORECASE
        )
        tags: list[str] = []
        detail_lines: list[str] = []

        for line in content_lines:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.lower().startswith("skills:"):
                raw_tags = stripped[7:].strip()
                tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
            elif date_pattern.match(stripped):
                continue  # skip date line
            else:
                detail_lines.append(stripped)

        details = "\n".join(detail_lines)
        updates.append({"id": job_id, "details": details, "tags": tags})

    return updates
