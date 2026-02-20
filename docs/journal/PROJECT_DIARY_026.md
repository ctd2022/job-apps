# Project Diary 026 - Track 2.9.5 Post-Completion Review

**Date**: 02 February 2026
**Focus**: Track 2.9.5 Implementation Review (#124, #123, #79, #104)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: track2.8-semantic-ats
- **Track**: Track 2.9.5 COMPLETE
- **Last session**: Claude completed implementation and testing of four features: #124 (Fix Blank Labels), #123 (LLM Backend Picker), #79 (ATS Explainability UI), and #104 (Per-component Testing Strategy).
- **Next steps**: Implement recommendations from Ideas Backlog Review (see bottom of this entry). Start with backlog cull, then #78 Enhanced Gap Analysis.
- **Blocked/broken**: Nothing
- **Ideas backlog**: Reviewed by Gemini + Claude — see recommendations below. 115 ideas, ~70 still open. Cull needed.

---

## Summary

This entry confirms the successful implementation and testing of four key features by Claude:

### #124 — Fix Blank Backend/Created Labels
- **Backend**: Enhanced `JobStatusResponse` with `backend_type`, `company_name`, `job_title`, `created_at`, `completed_at`. The `get_job_status` endpoint now maps these fields, with `completed_at` derived from `updated_at` for completed jobs.
- **Frontend**: No changes were required as `normalizeJob()` already handles these fields.

### #123 — LLM Backend Picker for Apply Suggestions
- **Backend**: `ApplySuggestionsRequest` now includes optional `backend_type` and `model_name` fields. The endpoint uses these request overrides or falls back to the job's original backend.
- **Frontend**: `api.ts` was updated to accept `backendType`/`modelName` parameters. The `SuggestionChecklist` component now displays backend/model dropdowns above the Apply button, and `CVTextEditor` fetches the list of available backends and passes the selection through.

### #79 — ATS Explainability UI
- **Frontend**: A new component, `ATSExplainability.tsx`, was created. It features 5 collapsible sections: Score Breakdown (table), Category Completion (progress bars), Biggest Penalties (severity badges), Top Matches (section labels), and Semantic Insights (gaps, similarities, entity ratio). This component has been integrated into `JobDetail.tsx` (after `MatchExplanationCard`) and the right pane of `CVTextEditor.tsx`.

### #104 — Per-component Testing Strategy
- **Backend**: `pytest` and `pytest-asyncio` were added. A `tests/conftest.py` file was created with a temporary database fixture and test client. A total of 12 tests were implemented across `test_job_store.py`, `test_job_endpoints.py`, and `test_apply_suggestions.py`, all passing.
- **Frontend**: `vitest` and `@testing-library/react` were installed. `vitest.config.ts` and `test-setup.ts` were created. 11 tests were written for `SuggestionChecklist.test.tsx` and `ATSExplainability.test.tsx`, all passing.

**Test Results:**
- `python -m pytest tests/ -v`: 12 passed
- `npx vitest run`: 11 passed

All features are implemented and tested, confirming the completion of Track 2.9.5.

---

## Ideas Backlog Review (Gemini + Claude)

**Reviewers**: Gemini CLI (first pass), then Claude Code (second pass)
**Method**: Full review of `ideas.db` (115 ideas) for strategic alignment and prioritisation

### Agreed Recommendations (both agents)

1. **#78 (Enhanced Gap Analysis)** — top priority, natural next step after Track 2.8/2.9
2. **#81 (Multiple CVs per user)** — first step toward multi-profile support, immediate single-user value
3. **#84 (ML Intelligence Platform)** — too vague, defer until broken into concrete features
4. **#103 (Programme-Level CLAUDE.md)** — zero user value, low priority
5. **#4/#5 (Auth/Payments)** — defer, premature commercialisation

### Claude's Additional Recommendations

6. **Cull the backlog** — reject/archive 20-30 ideas that are scope creep (e.g. #29 Brand Archetype, #36 Interview Teleprompter, #64 Resignation Letter). 115 ideas for a single-user tool is decision paralysis. Anything outside the core loop of *apply > tailor CV > track outcome* should be cut.
7. **Audit #82/#87/#100 against #122** — before un-deferring these (as Gemini suggests), check what #122 (LLM-Assisted CV Improvement) already delivers. Some may be "Done" in spirit.
8. **#71 (Batch Processing) is not anti-quality** — Gemini dismissed it as contradicting tailored applications. Disagree: batch means applying the same tailoring pipeline to multiple jobs, not lowering quality.
9. **#91 (Kanban Tracker) and #72 (Historical Analytics) are undervalued** — directly serve the daily workflow, more useful than many "smart" features.
10. **Strategic fork: local vs. hosted** — #105 (Deploy Online) and #83 (AWS Bedrock) gate the product direction. Decide before piling on features.
11. **#119 (Token optimisation) needs a focused sprint** — "build efficiently as you go" is aspirational; without a dedicated pass, debt accumulates.

### Suggested Priority Order for Next Session

| # | Action |
|---|--------|
| 1 | Cull the backlog — reject/archive scope-creep ideas |
| 2 | #78 Enhanced Gap Analysis |
| 3 | Audit #82/#87/#100 against #122 deliverables |
| 4 | #81 Multiple CVs per user |
| 5 | Strategic decision: local vs. hosted (#105/#83) |