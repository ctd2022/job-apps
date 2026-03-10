# Project Diary — Entry 065

**Date**: 2026-03-10
**Track**: 3.1 — UX Polish
**Branch**: `main`
**Commits**: `949dbfb`, `edff975`, `30f2f67`, `eb424e5`, `bf54484`, `0fb120b`, `bed7db0`, `604aa5e`, `946fe32`, `5119a2e`, `d5447e7`

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Ideas #292–#295 (expandable jobs, inline edit, PII mask on Profile) + Ideas #296–#297 (full profile context for summary generation, LLM debug panel). Several post-implementation fixes. Idea #298 captured (Profile as CV source in New Application) — NOT yet implemented.
- **Next steps**: Implement Idea #298 — Profile mode in New Application form.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: #298 ready to implement.

---

## Session Summary

### Idea #292 — Expandable Work Experience Entries on Profile Page

Work experience rows were flat single-line items. Added expand/collapse per entry to show full description and detail bullets without leaving the page.

**Frontend** (`CandidateProfile.tsx`):
- `expandedJobs` Set state; chevron toggle per row.
- Expanded view shows description, details (bullets), tags, date range.
- "Expand all / Collapse all" button in the section header.

---

### Ideas #293 & #294 — Indigo Label Accents and Inline Edit for Expanded Job Entries

Field labels in the expanded job view gained indigo accent colouring for visual hierarchy. Inline editing wired up so fields can be edited directly in the expanded card without a modal.

**Frontend** (`CandidateProfile.tsx`):
- `editingJobId` state; clicking a field in expanded view activates inline edit mode.
- Labels styled with `text-indigo-600 dark:text-indigo-400`.
- Save/cancel controls within the expanded card.

---

### Idea #295 — PII Mask Toggle on Profile Page

Added a privacy mask so sensitive fields (name, email, phone, location, employer names, job titles) are hidden by default when the page is open — useful when screen-sharing or recording.

**Frontend** (`CandidateProfile.tsx`):
- `maskEnabled` boolean state toggled via an Eye/EyeOff button in the page header.
- `PIIBanner` component: amber notice bar shown when mask is active.
- Mask applied to PersonalInfoSection fields and WorkExperience rows.

**Subsequent fix** (`eb424e5`): extended mask to cover title, employer, description, and details within work experience rows.

**Subsequent fix** (`bf54484`): replaced single on/off toggle with per-category pill toggles (Personal Info, Job Titles, Employers, Descriptions). `PIIBanner` updated to list which categories are masked.

---

### Idea #296 — Full Profile Context for Summary Generation

`generate_summary` was only receiving `experience_text` (or raw `cv_text`), ignoring certifications, skills, education, professional development, and the headline.

**Backend** (`backend/main.py`):
- `_build_profile_context(profile, job_history, certifications, skills, education, pd_items)` — assembles all profile sections into structured plain text (HEADLINE, WORK EXPERIENCE with bullets, SKILLS grouped by category, CERTIFICATIONS, EDUCATION, PROFESSIONAL DEVELOPMENT).
- `generate_summary_endpoint` loads all sections from the store and passes assembled context to the LLM. Falls back to `cv_text` from the request if profile has no content.
- `GenerateSummaryRequest.cv_text` made optional (`= ""`).

**Backend** (`src/ats_optimizer.py`):
- `generate_summary(cv_text, ...)` renamed to `generate_summary(profile_context, ...)`.
- System message and prompt updated to reference "candidate profile" not "CV".

**Frontend** (`CandidateProfile.tsx`):
- `SummarySection.handleGenerate` no longer calls `assembleCV()`. Calls `generateSummary('')` — backend assembles from DB.
- JD textarea removed from SummarySection (not relevant on the Profile page).
- `SummarySection` moved to top of the right column, above Work Experience.

**Subsequent fix** (`604aa5e`): `details` field (the bullet content) was missing from `_build_profile_context` — only `description` was included. Fixed to output both fields per job.

---

### Idea #297 — LLM Debug Panel

**Backend** (`src/ats_optimizer.py`):
- `generate_summary` returns `tuple[str, str]` — `(summary, debug_prompt)`.

**Backend** (`backend/main.py`):
- Endpoint prepends a metadata header (timestamp, backend, model name) to `debug_prompt` and returns it alongside `summary`.

**Frontend** (`frontend/src/types.ts`):
- `SummaryGenerationResponse` gains `debug_prompt?: string`.

**Frontend** (`CandidateProfile.tsx`):
- Collapsible "LLM payload / model details" panel appears below the summary textarea after generation. Shows `[SYSTEM]` and `[USER]` blocks plus timestamp/model metadata. Cleared on next generate.

**Subsequent fix** (`946fe32`): initial version only returned the user prompt; system message (writing rules) was not included. Fixed to return `[SYSTEM]\n{system_message}\n\n[USER]\n{prompt}`.

**Subsequent fix** (`5119a2e`): added timestamp, backend name, and model name as a header block above the system/user content.

**Subsequent fix** (`d5447e7`): renamed panel label from "What was sent to the LLM" to "LLM payload / model details".

---

### Idea #298 — Profile as CV Source in New Application (CAPTURED, NOT YET IMPLEMENTED)

Plan captured in ideas backlog. Add `'profile'` as a third `cvMode` in `NewApplication.tsx` alongside `'Saved'` and `'Upload'`. Backend accepts `use_profile: bool = Form(False)` and assembles CV from profile store when true. Default to profile mode on load if the user has work history. See idea #298 for full spec.

---

## Key Behaviours

- Profile context for summary now includes all sections: headline, full work experience with bullets (`details` field), skills by category, certifications with org, education, and PD items.
- PII scrubbed before LLM and restored in output.
- Debug panel only appears after a successful generation; cleared on next attempt. Shows full system prompt + assembled profile content + model/timestamp metadata.
- PII mask on Profile page is per-category (Personal Info, Job Titles, Employers, Descriptions) — defaults off, persists only for the session.
