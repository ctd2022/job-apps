# Project Diary 046 - Candidate Profile & PII Privacy Layer (Idea #233)

**Date**: 26 February 2026
**Focus**: Structured job history, bidirectional CV sync, PII scrubbing before LLM calls
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: Track 3.0 — post-CV Coach feature work
- **Last session**: Implemented Idea #233 in full across 7 commits. Profile page is live at `/profile`. PII scrubber is wired to all LLM endpoints. Next idea is #234 (Profile page UI polish — currently too narrow).
- **Next steps**: Pick from #234, #235, #236, #237 — all small/low complexity, good for a focused session
- **Blocked/broken**: Nothing
- **Ideas backlog**:
  - #234 — Profile page UI/UX polish (too narrow, widen layout)
  - #235 — Fix misleading footer privacy claim ("CV never leaves this PC" is false with Gemini)
  - #236 — Pull from Profile: inject contact header into CV text (fixes CV Coach false positives) ← HIGH IMPACT, do first
  - #237 — CV Coach: cross-reference Profile for contact detail checks (contextual tip if email in Profile but not in CV)

---

## What Was Done

### Context

CV text was being sent to LLMs verbatim, including employer names and personal contact info (name, email, phone). This is a PII leak — especially problematic when using cloud LLMs like Gemini. Additionally, there was no structured place to maintain job history; it existed only as freetext in the CV textarea.

This session adds a full Candidate Profile system with three interlocking parts:
1. **Structured job history** stored in the DB (employer stays local)
2. **Bidirectional sync** between the profile DB and the CV textarea
3. **PII scrubber** that intercepts all LLM calls

---

## Implementation — 7 Checkpoints

### CP1: DB schema + ProfileStore (`backend/job_store.py`)

Three new tables added to `init_db()`:
- `candidate_profiles` — one row per user (`UNIQUE(user_id)`), stores personal info
- `job_history` — one row per role, includes employer (local only), title, dates, details, display_order
- `profile_tags` — normalized tags per job, FK to job_history with CASCADE delete

`ProfileStore` class added with: `get_or_create_profile`, `update_profile`, `list_job_history`, `create_job`, `update_job`, `delete_job`, `reorder_jobs`, `update_job_details` (for save-back).

### CP2: Profile API endpoints (`backend/main.py`)

9 new endpoints:
- `GET/PUT /api/profile` — personal info
- `GET/POST /api/profile/job-history` — list and create
- `PUT/DELETE /api/profile/job-history/{id}` — update and delete
- `PUT /api/profile/job-history/reorder` — set display order
- `GET /api/profile/assemble-cv` — render job history as CV text
- `POST /api/profile/sync-from-cv` — parse markers and write back to DB

### CP3: `cv_assembler.py` + `pii_scrubber.py`

**`backend/cv_assembler.py`**:
- `assemble_experience_section(job_history)` — renders each job as a `<!-- JOB:id -->` marked block with title, employer, dates, bullets, skills
- `parse_experience_section(cv_text)` — extracts `id`, `details`, `tags` from marked blocks; never touches employer

**`backend/pii_scrubber.py`**:
- `scrub(cv_text, profile, job_history)` → `ScrubResult` with scrubbed text + `{placeholder: original}` map
  - Employer names → `[COMPANY_{id}]`
  - Name/email/phone/location → `[CANDIDATE_NAME]` etc.
  - No-op if profile/job_history are empty (graceful degradation)
- `restore(text, replacements)` — re-injects originals into LLM response

### CP4: PII scrubber wired to all LLM endpoints

All four LLM-calling code paths now scrub before calling the LLM and restore the response:
1. `POST /api/jobs/{id}/apply-suggestions` — scrub CV, call `incorporate_keywords()`, restore
2. `POST /api/jobs/{id}/suggest-skills` — scrub CV, call `suggest_skills()` (no restore — response is a list)
3. `POST /api/jobs/{id}/gap-fill` — scrub CV, call `incorporate_user_experiences()`, restore
4. Background `process_job_application()` — scrub base_cv once, pass scrubbed to `tailor_cv()`, `generate_ats_optimized_cv()`, `generate_cover_letter()`, `answer_application_questions()`; restore each output

`process_job_application` signature extended with `user_id` (default `"default"`) — backward compatible.

### CP5: Frontend types + api.ts

New types: `CandidateProfile`, `JobHistoryRecord`, `ProfileUpdate`, `JobHistoryCreate`, `JobHistoryUpdate`.

9 new api.ts functions: `getProfile`, `updateProfile`, `listJobHistory`, `createJobHistoryRecord`, `updateJobHistoryRecord`, `deleteJobHistoryRecord`, `reorderJobHistory`, `assembleCV`, `syncFromCV`.

### CP6: `CandidateProfile.tsx` + nav + route

New page at `/profile` with:
- **Personal info section** — display/edit toggle (inline form), 7 fields
- **Work Experience section** — list of job cards with up/down reorder arrows, Edit and Delete buttons
- **Job modal** — employer, title, dates, `is_current` checkbox, details textarea, tags comma-input
- **PII privacy banner** — "Employer names are stored locally and never sent to AI"
- Nav item added to App.tsx (uses existing `User` icon from lucide-react)

### CP7: Pull from Profile + save-back + visual badges

**CVTextEditor.tsx**:
- "Pull from Profile" button in footer — calls `assembleCV()`, finds EXPERIENCE section (case-insensitive), replaces its content or appends at end
- Save-back in `handleSave()` — if CV contains `<!-- JOB:` markers after save, calls `syncFromCV()` and shows 3-second toast "Profile updated from CV edits"
- Visual badges in highlight view — `<!-- JOB:id -->` marker lines are hidden; the next rendered line gets a blue `Profile` badge

**CVManager.tsx**:
- Same "Pull from Profile" button in the edit modal footer

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Employer never parsed back from CV text | Employer is the PII boundary. Save-back only updates `details` + `tags`. |
| `<!-- JOB:id -->` uses DB id not employer name | LLMs never see employer names, even in markers |
| Scrubber is no-op when profile is empty | Zero breaking change for users who don't use the profile |
| Up/down arrows for reorder | Avoids DnD library dependency |
| Single profile per user via `UNIQUE(user_id)` | `get_or_create_profile()` auto-creates on first GET |

---

## Follow-up: Idea #234

Immediately after going live, the Profile page was identified as too narrow (`max-w-3xl`). Idea #234 captures this: widen layout, review card spacing, and consider two-column layout (personal info left, job history right) on wide screens.
