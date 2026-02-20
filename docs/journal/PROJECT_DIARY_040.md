# Project Diary 040 - Gap-Fill Wizard & ATS Feedback Polish

**Date**: 20 February 2026
**Focus**: Idea #82 (interactive CV gap-fill), bug fixes, UX cleanup
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 — ongoing polish and feature work
- **Last session**: Implemented CV gap-fill wizard (#82), fixed semantic % display bugs, deduplicated actionable suggestions and ATS Feedback panel.
- **Next steps**: Continue reviewing the site; next feature from backlog (#33 Pipeline Diagnosis or similar)
- **Blocked/broken**: Nothing
- **Ideas backlog**: #33 Pipeline Health Diagnosis (P5)

---

## What Was Done

### 1. Interactive CV Gap-Fill Wizard (#82)

Implemented the full end-to-end gap-fill feature across 6 files + 1 new component.

**How it works:**
- Questions are generated client-side from existing `gap_analysis` data (no extra API call)
- Up to 8 questions: 4 critical, 3 evidence, 2 semantic
- User fills answers or skips; skipped questions are excluded from the LLM call
- On submit, user-provided text is sent to a new `/api/jobs/{id}/gap-fill` endpoint
- LLM incorporates only the user's own words — no fabrication (temperature 0.3)
- Result pre-loads into the CV editor (marked dirty) for review before saving

**Files changed:**

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | `incorporate_user_experiences()` method |
| `backend/main.py` | `GapFillAnswer`/`GapFillRequest` models + `POST /gap-fill` endpoint |
| `frontend/src/types.ts` | `GapQuestion`, `GapAnswer` interfaces |
| `frontend/src/api.ts` | `gapFill()` function |
| `frontend/src/components/GapFillWizard.tsx` | New wizard component (idle → active → submitting → done) |
| `frontend/src/components/CVTextEditor.tsx` | `initialContent?` prop to pre-load gap-fill result |
| `frontend/src/components/JobDetail.tsx` | "Uncover Hidden Experience" CollapsibleSection |

Wizard appears in the ATS panel on any completed job with gap_analysis data. Backend/model selector shown on the final question step.

### 2. Semantic % display bug fixes

Two display bugs identified during site review:

- **Section similarities**: Values were already 0–100 from the backend (`similarity * 100` in `semantic_scorer.py` line 275) but the frontend multiplied by 100 again → e.g. 5090%. Fixed by removing the `* 100` in `ATSExplainability.tsx`.
- **Entity support ratio**: Raw ratio (cv_entities / jd_entities) can exceed 1.0 when CV has broad coverage. Frontend did `ratio * 100` giving e.g. 1600%. Fixed by capping at 100% for display: `Math.min(ratio * 100, 100)`.

### 3. Actionable suggestions deduplication

Skills like "Stakeholder Engagement" were appearing as Critical, Required, and Hard Skill simultaneously because `_generate_actionable_suggestions` in `ats_optimizer.py` had no cross-category deduplication.

Fixed by maintaining a `seen_skills` set and iterating categories in priority order (critical → required → hard_skills → preferred). First occurrence wins, keeping the highest-priority label.

### 4. ATS Feedback panel cleanup

Identified and resolved three duplication problems in the CV editor's right-hand ATS panel:

| Problem | Fix |
|---------|-----|
| "Biggest Penalties" duplicated "Improve CV" checklist | Removed entirely |
| "Actionable Suggestions" had a second Apply button (same as "Improve CV") | Made read-only — guidance only, no checkboxes |
| "Missing Critical Keywords" and "Missing Required Skills" overlapped | Merged into one deduplicated "Critical & Required Gaps" list |
| `(50% match)` shown on every suggestion (semantic fallback default) | Removed section_score display |
| `frequency_keywords` shown as raw internal key | Fixed label → "Other Keywords" |

---

## Commits This Session

| Hash | Message |
|------|---------|
| `22095bf` | feat: Add interactive CV gap-fill wizard (#82) |
| `26f8b51` | fix: Deduplicate actionable suggestions and correct semantic % display |
| `dff2c34` | refactor: Remove duplication from ATS Feedback panel |

---

## Lessons

- **Semantic scorer outputs 0–100, not 0–1** — `similarity = round(similarity * 100, 1)` is applied at the source. Frontend must not multiply again.
- **Entity support ratio is unbounded** — cap at 100% for display; ratio > 1 simply means good coverage.
- **Gap-fill wizard pattern**: generate questions from existing data client-side → no extra round-trip. Works well here and is reusable for similar features.
- **Single Apply action point**: when multiple UI sections can trigger the same LLM action, pick one and make the rest read-only. Avoids user confusion about which button to use.
