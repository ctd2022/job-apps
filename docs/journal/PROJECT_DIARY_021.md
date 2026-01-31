# Project Diary 021 - CV Versioning System

**Date**: 30 January 2026
**Focus**: CV Versioning Foundation (Idea #98)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.3 COMPLETE (CV Versioning System)
- **Last session**: Implemented idea #98 -- new `cv_versions` table, version-aware CVStore methods, job-to-CV-version linking, two new API endpoints, frontend types/API/components updated. Existing CVs auto-migrated to v1. All CRUD tests pass.
- **Next steps**: Continue the CV improvement pipeline. Priority order: **#99 In-App CV Text Editor** (lets user edit CV after seeing ATS results), then **#101 Re-Match Against Same Job** (re-run ATS with improved CV). These two together complete the core "improve and re-score" loop. After that, #100 (Auto-Suggest Keywords) and #102 (Score Comparison View) add polish.
- **Blocked/broken**: Nothing -- backend and frontend working, all endpoints tested via curl
- **Ideas backlog**: #98 Done. #99, #100, #101, #102 remain as the CV improvement pipeline. Also consider #81 (Multiple CVs per user -- broader UX for CV selection) once the version pipeline is solid.

---

## Summary

This session implemented the CV Versioning System (idea #98), the foundational architecture for the iterative CV improvement loop. CVs now track content snapshots as versions, and jobs link to the specific version used at processing time. This enables the future "edit CV, re-match, compare scores" workflow.

---

## Context: CV Improvement Pipeline

The long-term vision is a feedback loop: user submits CV -> gets ATS score and gap analysis -> edits CV to address gaps -> re-runs ATS -> compares scores. Idea #98 (versioning) is the data model foundation that makes this possible.

## What Was Done

### 1. Database Schema (backend/job_store.py)

**New table `cv_versions`:**
- `id`, `cv_id` (FK to cvs), `version_number`, `filename`, `content`, `change_summary`, `created_at`
- UNIQUE constraint on `(cv_id, version_number)`
- Index on `cv_id` for fast lookups

**Migrations (idempotent):**
- `cvs.current_version_id INTEGER` -- points to the latest cv_versions row
- `jobs.cv_version_id INTEGER` -- records which CV version was used for the job

**Data migration:** On first startup, existing CVs with content are auto-migrated to v1 entries in `cv_versions`, with `current_version_id` set accordingly. The legacy `content` and `filename` columns on `cvs` are kept (SQLite limitation) but new code reads through `cv_versions`.

### 2. CVStore Methods (backend/job_store.py)

All existing methods updated to work through the versioning layer:

| Method | Change |
|--------|--------|
| `create_cv()` | Inserts CV parent + v1 in `cv_versions`, sets `current_version_id` |
| `get_cv()` | JOINs with `cv_versions` via `current_version_id` for content/filename |
| `get_cv_content()` | Reads from `cv_versions`; falls back to legacy column |
| `list_cvs()` | JOINs for filename + version_number from current version |
| `update_cv()` | Content changes create new version (v+1); name-only changes don't |
| `delete_cv()` | Cascades delete to `cv_versions` |
| `_row_to_dict()` | Includes `version_number`, `current_version_id`, optional `version_count` |

**New methods:**
- `list_cv_versions(cv_id)` -- all versions (metadata, no content), desc order
- `get_cv_version(version_id)` -- single version with full content
- `get_cv_version_content(version_id)` -- content only (for job processing)

### 3. Job-CV Version Link (backend/main.py)

In `create_job`: when a stored CV is used (`cv_id` provided), the `current_version_id` is resolved and stored as `cv_version_id` on the job record. Uploaded CVs (no stored CV) have `cv_version_id = NULL`.

`JobStore._row_to_dict()` updated to include `cv_version_id`.

### 4. New API Endpoints (backend/main.py)

- `GET /api/cvs/{cv_id}/versions` -- list all versions (metadata, no content)
- `GET /api/cvs/{cv_id}/versions/{version_id}` -- get specific version with content

Existing endpoints updated to include `version_number` in responses: `GET /api/cvs`, `POST /api/cvs`, `GET /api/cvs/default`.

### 5. Frontend (types.ts, api.ts, components)

- **types.ts**: New `CVVersion` interface. `StoredCV` extended with `version_number`, `current_version_id`, `version_count`. `Job` extended with `cv_version_id`.
- **api.ts**: New `getCVVersions()`, `getCVVersion()`. `normalizeJob` includes `cv_version_id`.
- **NewApplication.tsx**: Version badge ("v2", "v3") shown next to CV name when version > 1.
- **JobDetail.tsx**: "CV version tracked" indicator when job has a linked CV version.

## Design Decision: Separate cv_versions Table

Evaluated three approaches:
- **A. Separate table (chosen):** Clean separation of CV identity from version content. Simple queries for both listing CVs and listing versions.
- **B. Self-referencing FK:** Muddied the data model -- every query for "list my CVs" would need to filter out child rows.
- **C. Group by name+user_id:** Fragile -- renaming breaks the chain, name collisions create false groupings.

## Verification

- Schema: `cv_versions` table created, columns migrated
- Migration: 2 existing CVs migrated to v1 entries
- CRUD: Create, update (creates v2, v3), rename (no new version), delete (cascades), all verified
- Ownership: Wrong user gets 404
- API: All endpoints return correct JSON
- TypeScript: No new errors (pre-existing unrelated warnings only)

## Tomorrow: Continue CV Improvement Pipeline

The recommended sequence for the next sessions:

1. **#99 In-App CV Text Editor** -- After viewing ATS results, user clicks "Improve CV" to open a modal with editable CV text. On save, creates a new version via `update_cv()`. This is the next logical step because the versioning infrastructure is now in place.

2. **#101 Re-Match Against Same Job** -- After editing, prompt "Re-match against this job?" which triggers a new ATS analysis using the improved CV version against the stored job description text. Requires a new endpoint that creates a lightweight "re-match" job reusing the stored JD.

3. **#100 Auto-Suggest Keywords** -- Populate the editor with clickable suggestions from the ATS gap analysis ("Click to add 'cloud computing' to your Skills section").

4. **#102 Score Comparison View** -- Side-by-side view of v1 vs v2 scores, showing which gaps were closed.

Also worth revisiting **#81 (Multiple CVs per user)** for broader UX -- allowing users to maintain role-specific base CVs (e.g., "PM-focused", "Technical") that each have their own version chain.

---

**Ideas updated**: #98 marked as Done.
