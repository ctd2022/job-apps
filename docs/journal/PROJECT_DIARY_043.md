# Project Diary 043 - Keyword Priority Ranking (Idea #58)

**Date**: 23 February 2026
**Focus**: Idea #58 — Keyword Priority Ranking
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track-jd-intelligence`
- **Track**: JD Intelligence — #58 done, #32 and #23 remain
- **Last session**: Shipped Idea #58 — keyword priority badges (H/M/L) on ATS missing keywords. Debugged a Windows uvicorn reload ghost-process issue.
- **Next steps**: Implement #32 (JD Section Extraction) then #23
- **Blocked/broken**: Nothing. Backend running without `--reload` (Windows zombie issue).
- **Ideas backlog**: #32 and #23 still In Progress

---

## What Was Built

### Idea #58 — Keyword Priority Ranking

Each missing keyword chip in the ATS panel now shows an inline badge: **H** (red), **M** (amber), or **L** (slate).

**Priority formula:**
1. Category base: `critical_keywords` → HIGH, `required`/`hard_skills` → MEDIUM, others → LOW
2. Signal override: keyword appears in first 200 words of JD → HIGH
3. Frequency boost: keyword appears ≥3 times in JD → bump one level (LOW→MEDIUM, MEDIUM→HIGH)

**Files changed:**

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | `_compute_keyword_priority()` static method; `keyword_priorities` dict added to return |
| `backend/main.py` | Backfill `keyword_priorities` when serving cached ATS results from DB |
| `frontend/src/types.ts` | `keyword_priorities?: Record<string, 'HIGH' \| 'MEDIUM' \| 'LOW'>` on `ATSAnalysisData` |
| `frontend/src/components/MissingKeywordsAlert.tsx` | `priorityBadge()` helper; badge appended to all 4 keyword sections |

---

## Debugging: Windows Uvicorn Ghost Process

**Symptom:** All badges showed `L` after the fix was deployed. The backfill logic was correct and the DB data was right, but the API returned empty `keyword_priorities`.

**Root cause:** On Windows, uvicorn's `--reload` mode silently fails to restart the worker process after detecting changes. The old worker process held port 8000 and continued serving stale code. The new worker spawned but couldn't bind the port and exited. From the outside everything looked normal (200 OK, valid JSON), but the code was never updated.

**Fix:** Kill all python processes, wait for port release, restart without `--reload`.

**Lesson added to CLAUDE.md troubleshooting:** Always verify port ownership when "was working before, now broken" — uvicorn `--reload` on Windows is unreliable for hot-reloading.

---

## Commits

- `feat: add keyword priority ranking badges to ATS missing keywords (Idea #58)`
- `fix: backfill keyword_priorities for cached ATS results in get_ats_analysis`
- `chore: remove debug prints from get_ats_analysis backfill`
