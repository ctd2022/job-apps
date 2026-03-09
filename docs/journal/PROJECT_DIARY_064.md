# Project Diary — Entry 064

**Date**: 2026-03-09
**Track**: 3.1 — UX Polish
**Branch**: `main`
**Commits**: `78c3768`, `a9acd99`

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Implemented Ideas #289 (delete individual CV versions) and #291 (sync CV edits back to Profile after rematch), plus a bug fix for stale version references when a deleted version was still linked to a job.
- **Next steps**: Check ideas backlog for next UX Polish priority.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: #289 and #291 are Done.

---

## Session Summary

### Idea #289 — CV Manager: Delete Individual CV Versions

Users could not remove bad or regressed CV versions without deleting the whole CV. Added per-version delete with a backend guard against removing the last version.

**Backend** (`backend/job_store.py`):
- `delete_cv_version(version_id, user_id)` — verifies ownership, enforces last-version guard (returns `{"error": "last_version"}`), auto-promotes `cvs.current_version_id` and `cvs.content` if the current version is deleted, re-points any `jobs` and `match_history` rows referencing the deleted version to the promoted version.

**Backend** (`backend/main.py`):
- `DELETE /api/cvs/{cv_id}/versions/{version_id}` — returns 409 on last-version, 404 if not found.

**Frontend** (`frontend/src/api.ts`):
- `deleteCVVersion(cvId, versionId)` fetch helper.

**Frontend** (`frontend/src/components/CVManager.tsx`):
- Trash icon per version row in the expanded version table.
- `(current)` badge on the active version.
- Disabled (opacity 30%) when it's the only version.
- Spinner replaces icon while delete is in flight.

---

### Idea #291 — Sync CV Edits Back to Profile After Rematch

After editing and rematching a CV, there was no way to push the improved summary back to the Candidate Profile. Experience already synced silently on save via `<!-- JOB: -->` markers; the gap was summary sync + an explicit post-rematch prompt.

**Backend** (`backend/cv_assembler.py`):
- `parse_summary_section(cv_text)` — regex extracts the body text under a `PROFESSIONAL SUMMARY` header (case-insensitive, stops at next section or EOF).

**Backend** (`backend/main.py`):
- `SyncFromCVRequest` gains `sync_summary: bool = False`.
- `sync_from_cv` handler: when flag is set, calls `parse_summary_section` and `update_profile(user_id, summary=...)`, returns `summary_updated: bool`.

**Frontend** (`frontend/src/api.ts`):
- `syncFromCV(cvText, syncSummary=false)` passes `sync_summary` to API.

**Frontend** (`frontend/src/components/CVTextEditor.tsx`):
- "Sync to Profile" button in the rematch result banner.
- On success: button replaced by "Profile updated" text (fades after 3s).
- Resets to button on each new rematch.

---

### Bug Fix — Stale CV Version Reference After Delete

Deleting a version linked to a job caused the editor to error with 404 when opening that job.

**Root cause**: `jobs.cv_version_id` stored the deleted version ID; no update occurred on delete.

**Fix 1 — Backend** (`backend/job_store.py`):
- `delete_cv_version()` now runs `UPDATE jobs SET cv_version_id = ? WHERE cv_version_id = ?` (and same for `match_history`) to re-point existing references to the promoted version. Prevents the issue for all future deletes.

**Fix 2 — Frontend** (`frontend/src/components/CVTextEditor.tsx`):
- `loadVersion()` catches the 404, falls back to loading the default CV's current content, and shows a warning banner: *"The linked CV version was deleted. Loaded the default CV instead — save to create a new version."* Handles pre-existing stale references without requiring a data migration.
