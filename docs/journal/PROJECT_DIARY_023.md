# Project Diary 023 - CV Refinement Loop Sprint

**Date**: 2 February 2026
**Focus**: Re-Match (#101), Score Comparison (#102), Side-by-Side ATS Viewer (#120)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.3 -- CV Refinement Loop complete
- **Last session**: Implemented the full CV refinement loop: ATS re-match endpoint (#101), side-by-side ATS feedback viewer in the CV editor (#120), and per-category score comparison after re-match (#102). Also fixed JobStatusResponse missing cv_version_id field. Gemini added sprint_group and idea_dependencies to ideas.db schema.
- **Next steps**: #121 (ATS Score History per Job) -- track match iterations instead of overwriting. #100 (Auto-Suggest Keywords). Consider #104 (Per-Component Testing).
- **Blocked/broken**: Nothing -- backend and frontend compile clean, all pre-existing TS warnings only
- **Ideas backlog**: #121 added (ATS Score History). Pipeline remaining: #100, #121. #104 deferred.

---

## Summary

This session completed the CV Refinement Loop sprint (ideas #101, #102, #120), enabling users to edit their CV while viewing ATS feedback side-by-side, re-run ATS scoring, and see per-category score comparisons. The session also involved collaboration with Gemini, which added sprint grouping and dependency tracking to the ideas database.

---

## 1. Feature: ATS Re-Match Endpoint (Idea #101) -- COMPLETE

Backend endpoint `POST /api/jobs/{job_id}/rematch` that re-runs only ATS analysis (skipping CV generation, cover letter, Q&A) using a new CV version against the same stored job description.

**Backend changes (`backend/main.py`):**
- New `RematchRequest` Pydantic model with `cv_version_id` field
- New `/rematch` endpoint: validates job, fetches CV version content and stored JD text, reconstructs LLM backend from job's `backend_type`, runs `ATSOptimizer.generate_ats_report()` in thread executor, updates job with new score/details/cv_version_id
- Fixed `JobStatusResponse` to include `cv_version_id` field (was being stripped from API responses)
- Added `cv_version_id` to `get_job_status` endpoint response construction

**Frontend changes:**
- `RematchResponse` type in `types.ts`
- `rematchATS()` API function in `api.ts`
- Re-match button in CVTextEditor after save, with loading state and result display

---

## 2. Feature: Side-by-Side ATS Feedback Viewer (Idea #120) -- COMPLETE

Transformed the CV text editor from a single-pane modal to a split-pane layout with ATS feedback alongside the editor.

**CVTextEditor.tsx major refactor:**
- Modal expands to `max-w-7xl` when job context is present (stays `max-w-4xl` without)
- Left pane: CV text editor with banners (save success, re-match prompt, progress, result)
- Right pane (400px): loads ATS analysis on mount via `getATSAnalysis(jobId)`, displays MissingKeywordsAlert, MatchExplanationCard, and CVCompletenessMeter (all existing components reused)
- Both panes scroll independently
- Right pane updates with new analysis after re-match
- Fixed parent re-render issue: removed `onSaved()` from save handler to prevent component remount losing state; moved refresh to `onClose` handler instead

---

## 3. Feature: Score Comparison View (Idea #102) -- COMPLETE

Per-category score comparison displayed in the right pane after re-match.

**New types (`types.ts`):**
- `CategoryComparison` interface: tracks old/new matched/missing counts per category, keywords that moved between states
- `ATSComparisonData` interface: overall score delta, category breakdowns, aggregated keywords addressed/still missing

**New component (`ScoreComparisonPanel.tsx`):**
- Wrapped in CollapsibleSection, defaults expanded
- Per-category table rows showing old matched/total -> new matched/total with colored delta
- Green badges for keywords now matched
- Amber badges for keywords still missing (capped at 15 with overflow count)
- Category name formatting (e.g. `critical_keywords` -> "Critical Keywords")

**Comparison logic (`CVTextEditor.tsx`):**
- `computeComparison()` pure function: takes old and new `ATSAnalysisData`, computes per-category diffs by comparing `items_matched`/`items_missing` arrays
- Snapshots current analysis before re-match, computes comparison after
- ScoreComparisonPanel renders at top of right pane when comparison data exists

---

## 4. Gemini Agent Contributions

Gemini added sprint grouping and dependency tracking to the ideas database:

**Schema changes (`ideas.db`):**
- New `sprint_group` TEXT column on ideas table
- New `idea_dependencies` table with `idea_id` and `dependency_id` foreign keys

**Script updates:**
- `scripts/ideas.py` updated for new fields
- `scripts/ideas_html.py` updated for HTML rendering
- `gemini.md` updated with secondary agent context

---

## 5. New Ideas Captured

- **#120** (Done): Side-by-Side ATS Feedback Viewer in CV Editor
- **#121** (Idea): ATS Score History per Job -- track all re-match iterations instead of overwriting single score. Needs new DB table, backend endpoint, and frontend iteration list.

---

## Files Changed

| File | Changes |
|------|---------|
| `backend/main.py` | Added `RematchRequest` model, `POST /api/jobs/{job_id}/rematch` endpoint, fixed `JobStatusResponse` to include `cv_version_id` |
| `frontend/src/types.ts` | Added `RematchResponse`, `CategoryComparison`, `ATSComparisonData` interfaces |
| `frontend/src/api.ts` | Added `rematchATS()` function, updated imports |
| `frontend/src/components/CVTextEditor.tsx` | Major refactor: split-pane layout, ATS data loading, comparison logic, re-match flow |
| `frontend/src/components/ScoreComparisonPanel.tsx` | **NEW** -- Per-category score comparison component |
| `frontend/src/components/JobDetail.tsx` | Pass `jobId` to CVTextEditor, refresh on close |
| `ideas.db` | #101/#102/#120 Done, #121 added, sprint_group and dependencies schema (Gemini) |
| `scripts/ideas.py` | Sprint group and dependency support (Gemini) |
| `scripts/ideas_html.py` | HTML rendering updates (Gemini) |
| `gemini.md` | Updated secondary agent context (Gemini) |
