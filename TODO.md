# TODO.md - Agent Handover

**Status**: COMPLETE
**Date**: 2026-03-11
**Task**: Job Metadata Fields — employment type, salary, listing URL (Idea #308)
**Completed by**: Gemini + Claude (review & merge)

## Summary

Added three optional metadata fields to job application records:
- `employment_type` — free text (e.g. Permanent, Contract)
- `salary` — free text (e.g. £60,000–£80,000 pa)
- `listing_url` — URL to original job posting, renders as clickable link

Fields appear on the JobDetail page in a "Job Metadata" section with inline editing. Shown in ApplicationHistory list. No changes to the New Application form — metadata is added post-creation.

## Files changed
- `backend/job_store.py` — 3-column migration
- `backend/main.py` — `PATCH /api/jobs/{id}/metadata` endpoint
- `frontend/src/types.ts` — fields added to `Application` + `JobStatus`; `JobMetadataUpdate` interface
- `frontend/src/api.ts` — `updateJobMetadata()` function
- `frontend/src/components/JobDetail.tsx` — metadata display + inline edit section
- `frontend/src/components/ApplicationHistory.tsx` — employment type badge

**Branch**: `feature/idea-308-job-metadata` — merged to `main` 2026-03-11

---

**End of handover**
