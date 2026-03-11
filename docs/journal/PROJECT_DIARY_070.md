# Project Diary — Entry 070

**Date**: 2026-03-11
**Track**: 3.1 — UX Polish
**Ideas completed**: #308

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Added job metadata fields (employment type, salary, listing URL) to JobDetail via Gemini delegation. Also established the feature-branch + no-commit Gemini handover pattern.
- **Next steps**: Continue UX Polish — two small ideas logged (#311 salary currency symbol, #312 privacy footer cleanup).
- **Blocked/broken**: Nothing
- **Ideas backlog**: #311, #312 newly added (low complexity)

---

## Idea #308 — Job Metadata Fields

**Problem**: Job records had no way to capture employment type, salary, or the original listing URL, making it hard to compare and track opportunities.

**Approach**: Delegated to Gemini on a feature branch. Three optional free-text fields added to the `jobs` table via migration. Inline editing on JobDetail page. No changes to the New Application form — metadata added post-creation.

### Changes

| File | Change |
|------|--------|
| `backend/job_store.py` | Migration: `employment_type`, `salary`, `listing_url` columns |
| `backend/main.py` | `PATCH /api/jobs/{id}/metadata` endpoint |
| `frontend/src/types.ts` | Fields on `Application` + `JobStatus`; `JobMetadataUpdate` interface |
| `frontend/src/api.ts` | `updateJobMetadata()` |
| `frontend/src/components/JobDetail.tsx` | "Job Metadata" section — display + inline edit (3-column grid) |
| `frontend/src/components/ApplicationHistory.tsx` | Employment type badge in list |

### Key behaviours
- All three fields optional; show "Not specified" when empty
- `listing_url` renders as a clickable link (new tab)
- Edit/Cancel/Save inline — no modal
- Metadata section appears for all jobs regardless of status

---

## Workflow: Feature Branch + No-Commit Pattern

Established a new Gemini delegation convention this session:

1. Claude creates `feature/idea-NNN-short-name` branch before writing TODO.md
2. Gemini implements on that branch, does **not** commit
3. Gemini starts services and asks user to verify the app
4. User confirms, Claude reviews diff and commits + merges

Updated `CLAUDE.md` handover protocol and `MEMORY.md` to capture this.

---
