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


def assemble_summary_section(profile: dict) -> str:
    """Render the professional summary from profile data."""
    text = (profile.get("summary") or "").strip()
    if not text:
        return ""
    return f"PROFESSIONAL SUMMARY\n{text}"


def assemble_education_section(education: list[dict[str, Any]]) -> str:
    """Render education records into a plain-text EDUCATION section.

    Format per entry:
        <!-- EDU:id -->
        qualification | institution
        start_date – end_date (or Present)
        Grade: X | field_of_study  (only whichever are present)
    """
    if not education:
        return ""

    lines: list[str] = ["EDUCATION"]
    for edu in education:
        edu_id = edu["id"]
        institution = edu.get("institution") or ""
        qualification = edu.get("qualification") or ""
        start = edu.get("start_date") or ""
        end = edu.get("end_date") or ("Present" if edu.get("is_current") else "")
        date_range = f"{start} \u2013 {end}".strip(" \u2013")
        grade = edu.get("grade") or ""
        field = edu.get("field_of_study") or ""

        lines.append(f"<!-- EDU:{edu_id} -->")
        lines.append(f"{qualification} | {institution}")
        if date_range:
            lines.append(date_range)
        detail_parts = []
        if grade:
            detail_parts.append(f"Grade: {grade}")
        if field:
            detail_parts.append(field)
        if detail_parts:
            lines.append(" | ".join(detail_parts))
        lines.append("")

    return "\n".join(lines).rstrip()


def _format_cert_line(cert: dict[str, Any]) -> str:
    """Format a single certification as a pipe-separated line."""
    name = cert.get("name") or ""
    org = cert.get("issuing_org") or ""
    obtained = cert.get("date_obtained") or ""
    no_expiry = cert.get("no_expiry") or False
    expiry = cert.get("expiry_date") or ""
    cred_id = cert.get("credential_id") or ""
    cred_url = cert.get("credential_url") or ""

    date_part = obtained
    if obtained and (no_expiry or expiry):
        date_part += " \u2013 " + ("No Expiry" if no_expiry else expiry)

    parts = [p for p in [name, org, date_part] if p]
    if cred_id:
        parts.append(f"ID: {cred_id}")
    if cred_url:
        parts.append(cred_url)
    return " | ".join(parts)


def assemble_certifications_section(
    certifications: list[dict[str, Any]],
    orgs: list[dict[str, Any]] | None = None,
    grouping_mode: str = "flat",
) -> str:
    """Render certifications into a plain-text CERTIFICATIONS section.

    grouping_mode='flat' (default): one line per cert, org in the line.
    grouping_mode='by_org': org name as subheading, certs listed beneath.

    Format per entry:
        Name | Issuing Org | date_obtained - expiry_date (or No Expiry) | ID: credential_id
    Wrapped in <!-- CERT:id --> markers.
    """
    if not certifications:
        return ""

    lines: list[str] = ["CERTIFICATIONS"]

    if grouping_mode == "by_org" and orgs:
        org_map = {o["id"]: o for o in orgs}
        # Group certs by issuing_org_id; uncategorised last
        from collections import defaultdict
        grouped: dict[Any, list[dict[str, Any]]] = defaultdict(list)
        for cert in certifications:
            grouped[cert.get("issuing_org_id")].append(cert)

        # Orgs with at least one cert, in org name order
        org_ids_ordered = [
            o["id"] for o in sorted(orgs, key=lambda o: o["name"])
            if o["id"] in grouped
        ]
        for org_id in org_ids_ordered:
            org = org_map[org_id]
            label = org.get("display_label") or org["name"]
            lines.append(f"\n{label}")
            for cert in grouped[org_id]:
                lines.append(f"<!-- CERT:{cert['id']} -->")
                lines.append(_format_cert_line(cert))
        # Uncategorised (no org)
        if None in grouped:
            lines.append("\nOther")
            for cert in grouped[None]:
                lines.append(f"<!-- CERT:{cert['id']} -->")
                lines.append(_format_cert_line(cert))
    else:
        for cert in certifications:
            lines.append(f"<!-- CERT:{cert['id']} -->")
            lines.append(_format_cert_line(cert))

    return "\n".join(lines)


def assemble_skills_section(skills: list[dict[str, Any]]) -> str:
    """Render skills into a plain-text SKILLS section, grouped by category.

    Format:
        SKILLS
        Languages: Python, TypeScript, SQL
        Cloud: AWS, GCP
        (Uncategorised skills listed individually)
    """
    if not skills:
        return ""

    from collections import defaultdict
    grouped: dict[str, list[str]] = defaultdict(list)
    uncategorised: list[str] = []

    for skill in skills:
        name = skill.get("name") or ""
        category = (skill.get("category") or "").strip()
        if category:
            grouped[category].append(name)
        else:
            uncategorised.append(name)

    lines: list[str] = ["SKILLS"]
    for category, names in grouped.items():
        lines.append(f"{category}: {', '.join(names)}")
    for name in uncategorised:
        lines.append(name)

    return "\n".join(lines)


def assemble_professional_development_section(items: list[dict[str, Any]]) -> str:
    """Render professional development items into a plain-text PROFESSIONAL DEVELOPMENT section.

    Only items with show_on_cv=True are included.
    Format varies by type and status.
    """
    visible = [i for i in items if i.get("show_on_cv")]
    if not visible:
        return ""

    lines: list[str] = ["PROFESSIONAL DEVELOPMENT"]
    for item in visible:
        item_type = item.get("type") or ""
        title = item.get("title") or ""
        provider = item.get("provider") or ""
        status = item.get("status") or ""
        target = item.get("target_completion") or ""
        completed = item.get("completed_date") or ""
        start = item.get("start_date") or ""

        if item_type == "Professional Membership":
            date_part = "Ongoing"
        elif status == "Completed":
            date_part = f"Completed: {completed}" if completed else "Completed"
        elif item_type == "Certification" or item_type == "Course / Training":
            if target:
                date_part = f"In Progress (expected: {target})"
            else:
                date_part = "In Progress"
        elif item_type == "Conference / Event":
            date_part = start if start else status
        else:
            date_part = status

        parts = [p for p in [title, provider, date_part] if p]
        lines.append(" | ".join(parts))

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
