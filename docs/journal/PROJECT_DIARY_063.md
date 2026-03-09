# Project Diary — Entry 063

**Date**: 2026-03-09
**Track**: 3.1 — Candidate Profile & UX Polish

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.1 — ongoing UX improvements
- **Last session**: ATS score history popup on dashboard, full Pull from Profile (all sections), CV Preview modal, shared pull utility
- **Next steps**: Review ideas backlog; Idea #289 (delete CV versions) is next high-priority candidate
- **Blocked/broken**: Nothing
- **Ideas backlog**: #289 (delete CV versions, High), #290 Done

---

## Session Summary

Three distinct features shipped in this session.

### 1. ATS Score History popup on Dashboard and Application History

The dashboard and history table previously showed only the latest ATS score. A new inline popup shows the full score evolution for any application.

**How it works:**
- Clicking the ATS score badge (tier label + percentage) in the table opens a popover
- History is lazy-fetched on first click via the existing `GET /api/jobs/{id}/match-history` endpoint (no backend changes needed)
- Results are cached per row for the session
- Each iteration shows: number, score, keyword match ratio (e.g. `47/53 kw`), delta vs previous (green ↑ / red ↓), timestamp
- Latest iteration is highlighted in indigo with a "latest" pill
- Closes on click-outside

Also fixed a related bug: the dashboard was showing the original ATS score from `metadata.json` rather than the updated score from the database (which rematch updates). Fixed by preferring `db_job["ats_score"]` over the metadata value in `GET /api/applications`.

**Files**: `frontend/src/components/Dashboard.tsx`, `frontend/src/components/ApplicationHistory.tsx`, `backend/main.py`

---

### 2. Full Pull from Profile (all sections) + shared utility

"Pull from Profile" previously only inserted contact header, summary, and experience. Education, certifications, skills, and professional development were assembled by the backend but silently dropped.

**Changes:**
- Extracted all pull logic into `frontend/src/utils/pullFromProfile.ts`:
  - `applyProfileSections(currentText, sections)` — idempotent merge of all 7 sections
  - `stripContactHeader(text)` — shared helper (was duplicated in all three editors)
  - Each section uses `replaceOrAppendSection()`: detects existing `## Heading` and replaces content, or appends if not found
- Insertion order: contact (prepended) → summary → experience → education → certifications → skills → professional development
- All three editors (`CVManager`, `CvCoach`, `CVTextEditor`) updated to use the shared utility — `handlePullFromProfile` reduced from ~55 lines to 3 lines each

**PII handling — unchanged and correct:**
- Contact header (name/email/phone/location) lives in the CV editor as intended
- Backend `pii_scrubber.py` scrubs `full_name`, `email`, `phone`, `location` + employer names before any LLM call and restores after
- New sections (education institutions, cert names, skills) are not personal identifiers — no scrubber changes needed

**Files**: `frontend/src/utils/pullFromProfile.ts` (new), `CVManager.tsx`, `CvCoach.tsx`, `CVTextEditor.tsx`

---

### 3. CV Preview modal

A read-only preview of the fully assembled CV (from Profile) is now accessible directly from the CV workflow.

**How it works:**
- "Preview" button added alongside "Pull from Profile" in all three CV editors
- Opens a modal showing all visible sections concatenated — same output as Pull from Profile would insert
- Uses the `sections` array from `assembleCV()` if populated (respects section visibility/order config), falls back to individual fields in default order otherwise
- Refresh button re-assembles; closes on Escape or click-outside
- Footer note: "Read-only. Use Pull from Profile to insert into your CV editor."

**Files**: `frontend/src/components/CVPreviewModal.tsx` (new), `CVManager.tsx`, `CvCoach.tsx`, `CVTextEditor.tsx`

---

## Ideas Updated

| ID | Title | Status |
|----|-------|--------|
| #289 | CV Manager: delete individual CV versions | Idea (next candidate) |
| #290 | Audit Profile-to-CV integration UX end-to-end | Done |
