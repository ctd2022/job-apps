# Project Diary — Entry 062

**Date**: 2026-03-05
**Track**: 3.1 — Candidate Profile & UX Polish

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.1 — ongoing UX improvements
- **Last session**: Fixed Pro Summary save (stale zombie backend process), added summary to Pull from Profile, widened narrow screens, added interactive skill checkboxes in Gap Analysis with CV editor highlight
- **Next steps**: Continue UX polish; review ideas backlog for next track
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing urgent

---

## Session Summary

Four separate UX fixes and improvements across the session.

### 1. Professional Summary save fix

The `PUT /api/profile` endpoint was silently not saving `summary` (or `cert_grouping_mode`). Root cause: a zombie uvicorn worker process (PID 33248, orphaned child of dead parent 32520) was serving stale code that pre-dated the migration adding `summary` to the `allowed` fields in `update_profile`. The column existed in the DB and the Pydantic model was correct — it was purely a stale process issue.

Fix: killed the zombie, restarted backend fresh. Also added a `catch` block to `SummarySection.handleSave` so any future API failure shows a red error message rather than silently swallowing it.

**Files**: `frontend/src/components/CandidateProfile.tsx`

### 2. Professional Summary included in Pull from Profile

`handlePullFromProfile` in all three CV editor components only pulled `experience_text` and `contact_header`. `summary_text` was returned by the API but ignored.

Added summary injection logic to all three components. Behaviour:
- If a summary/profile section already exists in the CV, replace its content
- If no summary section exists, prepend the summary text (contact header is prepended last, so final order is: contact → summary → experience)
- Idempotent — pulling again refreshes the text without duplicating it

Section detection pattern handles both markdown (`## Summary`, `## Profile`) and plain-caps (`PROFESSIONAL SUMMARY`) formats.

**Files**: `CvCoach.tsx`, `CVTextEditor.tsx`, `CVManager.tsx`

### 3. Widened narrow screens

Several full-page views had their own `max-w` constraints that made them narrower than the Profile page (which fills the App-level `max-w-[1800px]` container):

| Component | Before | After |
|-----------|--------|-------|
| `CVTextEditor` modal | `max-w-4xl`/`max-w-7xl` conditional | `max-w-[95vw]` |
| `JobDetail` | `max-w-6xl mx-auto` | `w-full` |
| `NewApplication` | `max-w-6xl mx-auto` | `w-full` |

**Files**: `CVTextEditor.tsx`, `JobDetail.tsx`, `NewApplication.tsx`

### 4. Gap Analysis — interactive skill checkboxes with CV editor highlight

The Actionable Suggestions section in Gap Analysis previously showed static rows (`[Badge] Skill → Add to experience`). Replaced with an interactive checklist:

- Each row is now a checkbox `<label>`
- Ticking an **unchecked** item: opens the CV text editor modal and jumps to + selects the first occurrence of that skill in the textarea (using `setSelectionRange`). If the skill isn't in the CV yet (likely — it's a gap), the editor opens ready for manual insertion
- Ticking a **checked** item: just unchecks it
- Checked rows: strikethrough skill name + section label, dimmed to 50% opacity, border turns grey
- State is local to the session (resets on navigate) — appropriate for a working-session tool

Implementation:
- `GapAnalysis` — added `useState<Set<string>>` for checked state; added `onHighlightSkill?: (skill: string) => void` prop
- `CVTextEditor` — added `highlightTerm?: string` prop; `useRef<HTMLTextAreaElement>` on the textarea; `useEffect` watching `[highlightTerm, loading]` that calls `el.setSelectionRange()` and scrolls to position
- `JobDetail` — added `highlightTerm` state; wires `GapAnalysis.onHighlightSkill` → sets term + opens editor; clears term on editor close

**Files**: `GapAnalysis.tsx`, `CVTextEditor.tsx`, `JobDetail.tsx`
