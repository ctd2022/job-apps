# Project Diary 024 - ATS Match History

**Date**: 2 February 2026
**Focus**: ATS Score History per Job (#121)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.4 -- ATS Match History complete
- **Last session**: Implemented #121 -- new `match_history` table tracks every ATS scoring iteration per job. Backend stores entries on initial scoring and re-match. Frontend shows compact history table in JobDetail when 2+ iterations exist. Backfilled 32 existing jobs.
- **Next steps**: #100 (Auto-Suggest Keywords from ATS Analysis), #87 (Smart CV gap analysis), #78 (Enhanced Gap Analysis)
- **Blocked/broken**: Nothing -- backend and frontend compile clean, all pre-existing TS warnings only
- **Ideas backlog**: #121 done. Pipeline: #100, #87, #78

---

## Summary

Added persistent ATS match history so users can see all CV iterations tried against a job, with scores, deltas, keyword counts, and CV version info. Previously, re-matching overwrote the single `ats_score` on the jobs table.

---

## Changes

### Database (`backend/job_store.py`)
- New `match_history` table: `id, job_id, cv_version_id, score, matched, total, missing_count, created_at`
- Index on `(job_id, created_at)`
- `MatchHistoryStore` class with `add_entry()` and `get_history()` (JOINs cv_versions for version_number/change_summary)
- Backfill migration: seeds history from existing jobs with ATS scores (32 rows)

### Backend (`backend/main.py`)
- History entry inserted after initial ATS scoring in `process_job_application()`
- History entry inserted after re-match in `rematch_ats()`
- New `GET /api/jobs/{job_id}/match-history` endpoint

### Frontend
- `MatchHistoryEntry` and `MatchHistoryResponse` types
- `getMatchHistory()` API function
- `MatchHistoryTable` component -- compact table with iteration #, CV version, score, delta, keywords, date
- Integrated into `JobDetail.tsx` between ATS score bar and analysis details
- Only renders when `history.length > 1`

### Design decision
Stored summary scores only (not full `ats_details` JSON) to keep the table lean. Full analysis remains on the `jobs` table for the latest iteration.
