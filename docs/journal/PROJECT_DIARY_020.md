# Project Diary 020 - Multi-Agent Workflow and Core UX Refinement

**Date**: 30 January 2026
**Focus**: Multi-Agent Workflow, Debugging, Feature Ideation
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.2 COMPLETE (ATS analysis components integrated into UI)
- **Last session**: Wired 3 orphaned React components into JobDetail.tsx, debugged zombie process issue, added agent concurrency rules, captured 5 CV improvement loop ideas (#98-#102)
- **Next steps**: Manual testing with a newly generated job; begin planning CV Versioning (#98) as foundation for the improvement loop
- **Blocked/broken**: Nothing -- backend and frontend working, `workflow_available: true`
- **Ideas backlog**: 5 new high-priority ideas (#98-#102) for iterative CV improvement pipeline

---

## Summary

This session involved significant progress on Track 2.9.2 Core UX, deep debugging of backend "zombie" processes, and major improvements to the multi-agent development workflow. A substantial set of new feature ideas for CV improvement was also added to the backlog.

---

## Context: Track 2.9.2 Core UX, Debugging & Workflow Improvement

The primary goal for this session was to finalize the integration of ATS analysis components into the frontend and establish robust multi-agent operational guidelines. Unforeseen backend issues led to a critical debugging effort that informed process improvements.

## What Was Done:

#### 1. Track 2.9.2 Complete - ATS Analysis Components Integrated

Three previously orphaned React components were successfully wired into `JobDetail.tsx`:
- `MatchExplanationCard`: Displays a score breakdown (lexical/semantic/evidence stacked bar), keyword matches, semantic section matches, and improvement suggestions.
- `MissingKeywordsAlert`: Highlights priority-tiered missing keywords (critical/required/hard skills/preferred).
- `CVCompletenessMeter`: Presents a weighted section completeness checklist with entity counts.

All changes were confined to `frontend/src/components/JobDetail.tsx`, involving additions of imports, state management (`atsAnalysis`, `loadingAnalysis`), fetch logic within `loadJob()`, and conditional rendering between the ATS score bar and error section. Graceful degradation ensures legacy jobs without `ats_details` do not show errors. A loading spinner is displayed during data fetch. TypeScript checks passed with no new errors. Ideas #89, #96, #97 were marked as Done. Diary entry 019 was created by Gemini (marking the first successful handover for this track).

#### 2. Backend Debugging - Zombie Process Mystery

A critical issue arose where the user encountered a "Workflow modules not available" error when creating a job. Initial diagnosis suggested a missing `PyPDF2` dependency, leading to delegation to Gemini. However, the root cause was discovered by Claude to be **zombie Python processes** holding port 8000 after an earlier `python-multipart` installation crash. These stale processes prevented new server instances from running correctly, leading to silent failures and the old, broken process continuing to serve. `PyPDF2` was confirmed to be correctly installed. The fix involved killing all stale Python processes using `taskkill /F /PID <pid>` and restarting the backend on a clean port. Subsequent `workflow_available: true` status confirmed resolution. The key debugging technique identified was `netstat -ano | findstr :8000 | findstr LISTENING` to identify zombie PIDs.

#### 3. Multi-Agent Process Improvements

Two major lessons from the debugging session were captured and documented in both `CLAUDE.md` and `GEMINI.md`:

**A. Debugging Protocol**: A 5-step protocol was added to the Troubleshooting section: 1) check port ownership, 2) kill stale processes, 3) restart on clean port, 4) check health, 5) then investigate code. New troubleshooting table entries for `workflow_available: false`, stale restarts, and "was working before" scenarios were included. Delegation lessons emphasize a diagnostic-first approach, including known clues, and setting clear boundaries.

**B. Agent Concurrency Rule**: A strict rule was added to the Handover Protocol section: Claude and Gemini cannot see each other and have no coordination mechanism. Operation must be strictly turn-based, requiring the user to fully exit one agent before starting the other. Gemini was instructed not to touch services unless specifically tasked. Handover steps were updated to include "finish active work and stop background tasks."

#### 4. CV Improvement Loop - Feature Ideation

A substantial feature pipeline for CV improvement was proposed and added to the `ideas.db` backlog (ideas #98-#102):
- **#98 CV Versioning System** (Architecture, High complexity): Foundation for version tracking of CVs, supporting a 1-to-many job-to-CV-version relationship.
- **#99 In-App CV Text Editor** (Feature, Medium): A modal editor for raw CV text after ATS analysis.
- **#100 Auto-Suggest Keywords** (Feature, High): Functionality to inject missing keywords from ATS analysis into the editor.
- **#101 Re-Match Workflow** (Feature, Medium): Ability to re-run ATS scoring with an improved CV against the same job.
- **#102 Score Comparison View** (UI, Medium): Visual comparison of "before/after" ATS scores.

The proposed sequencing for implementation is #98 (foundation) -> #99 -> #101 -> #100 -> #102.

---

## Files Changed

| File | Changes |
|------|---------|
| `frontend/src/components/JobDetail.tsx` | Integrated 3 ATS analysis components with state, fetch, and rendering |
| `CLAUDE.md` | Added debugging protocol, troubleshooting entries, agent concurrency rule, updated handover protocol |
| `GEMINI.md` | Added debugging protocol, troubleshooting entries, agent concurrency rule |
| `backend/main.py` | Temporary debug changes during investigation (reverted to original print statements) |
| `backend/job_store.py` | Added methods for CV versioning to support future features |
| `frontend/src/api.ts` | Added `updateCvDetails` API call for future CV editing |
| `frontend/src/types.ts` | Added `CvDetails` and `UpdateCvDetailsRequest` types for CV versioning and editing |
| `ideas.db` | Ideas #89, #96, #97 marked Done; ideas #98-#102 added (CV improvement loop) |
| `docs/journal/PROJECT_DIARY_019.md` | Created by Gemini (Track 2.9.2 integration) |
| `docs/journal/PROJECT_DIARY_020.md` | This file: documentation of this session |

---

## What's Next

Following this, all changes will be committed and pushed. Manual testing of the ATS analysis display with newly generated jobs will be performed. The next major planning will focus on Track for CV Versioning (#98), which forms the foundation for the CV improvement loop. Consideration will be given to delegating data model review for CV versioning to Gemini for large-context analysis.

---

## Commits

(A commit will be created for this work.)

---

**End of Diary Entry 020**