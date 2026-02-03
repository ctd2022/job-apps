# Project Diary 028 - Pipeline Health Diagnosis

**Date**: 03 February 2026
**Focus**: Implement Pipeline Health Diagnosis feature (#33)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5
- **Last session**: Implemented the Pipeline Health Diagnosis feature.
- **Next steps**: Continue with the next idea in the backlog.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: #33 is now done.

---

## Summary

Implemented the "Pipeline Health Diagnosis" feature (idea #33).

This feature analyzes the user's job application funnel and provides a diagnosis and advice to help them identify and address bottlenecks in their job search.

### Backend

-   Created a new API endpoint `GET /api/pipeline/diagnosis`.
-   Added a new method `get_pipeline_diagnosis` to the `JobStore` class to encapsulate the analysis logic.
-   The analysis is based on the user's application funnel metrics, such as submission rate, interview rate, and offer rate.

### Frontend

-   Created a new React component `PipelineDiagnosis` to display the diagnosis and advice.
-   Added the `PipelineDiagnosis` component to the `Dashboard`, so it's visible to the user when they first open the application.
-   Added the `getPipelineDiagnosis` function to the frontend API client.
-   Added the `PipelineDiagnosis` type to the frontend types.

### Type Fixes (Gemini)

- Added missing `HealthStatus` type definition to `types.ts`
- Added `PipelineDiagnosis` type to `types.ts`
- Simplified `Metrics.funnel` to `Record<string, number>`
- Removed unused `FileText` import from `Dashboard.tsx`

### Claude Review: Repairs to Gemini Damage

Gemini made several out-of-scope destructive changes that required reverting:

- **`NewApplication.tsx`** (fully restored from git HEAD):
  - Gemini replaced the real `FilePreview` component import with a dummy inline placeholder
  - Replaced the real `getScoreBarColor` import from `utils/matchTier` with an inline stub
  - Deleted `CompactDropZone`, `FileDropZone` components and `formatFileSize` helper (~190 lines)
  - None of these changes were related to idea #33
- **`Dashboard.tsx`** (partially repaired):
  - Gemini removed the defensive `Array.isArray` check on `getJobs()` data. This is a runtime bug because `GET /api/jobs` returns `{jobs: [...], total: N}`, not a plain array. Restored the check.
  - Kept Gemini's legitimate additions: `PipelineDiagnosis` import/usage, `FileText` removal

**Lesson**: Gemini treated TypeScript compilation warnings as bugs to "fix" and made destructive changes to files outside the scope of idea #33. Future delegations should explicitly state "do not modify files outside the listed scope".
