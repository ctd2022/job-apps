# Project Diary 036 - Smart CV Gap Analysis with Actionable Suggestions

**Date**: 2026-02-06
**Track**: 2.9.4 - Actionable Gap Analysis

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.4 complete - Actionable Gap Analysis
- **Last session**: Implemented Idea #87 (actionable suggestions with section recommendations) and Idea #127 (checkboxes to apply suggestions). Also fixed missing backend endpoint for AI Skill Suggester.
- **Next steps**: Idea #128 - Show AI skill suggestions in Edit CV panel
- **Blocked/broken**: Nothing
- **Ideas backlog**: #128 (AI suggestions in Edit CV panel)

---

## Session Summary

### Idea #87 - Smart CV Gap Analysis with Actionable Suggestions

Transformed gap analysis from "what's missing" to "where to add it":

**Before**: "Missing: cloud computing, kubernetes"
**After**: "Add 'cloud computing' to Projects section (46% match)"

#### Changes

| File | Changes |
|------|---------|
| `src/ats_optimizer.py` | Added `_generate_actionable_suggestions()` method |
| `frontend/src/types.ts` | Added `ActionableSuggestion` interface |
| `frontend/src/components/GapAnalysis.tsx` | Enhanced UI with section recommendations |

### Idea #127 - Checkboxes for Batch Apply

Added interactive checkboxes to actionable suggestions so users can select and apply them directly.

#### Changes

| File | Changes |
|------|---------|
| `frontend/src/components/GapAnalysis.tsx` | Added checkbox state, select all, backend picker, Apply button |
| `frontend/src/components/ATSExplainability.tsx` | Pass-through props for onApply, applying, backends |
| `frontend/src/components/CVTextEditor.tsx` | Wired up handleApplySuggestions to ATSExplainability |

### Bug Fix - AI Skill Suggester Endpoint

The "Suggest Skills" button was returning 404. Added missing backend endpoint:

| File | Changes |
|------|---------|
| `backend/main.py` | Added `/api/jobs/{job_id}/suggest-skills` POST endpoint |

### Idea #128 (Added)

AI skill suggestions currently only appear in JobDetail view. Feature request to show them in the Edit CV panel for better workflow.

---

## Files Changed

```
src/ats_optimizer.py           - Added actionable suggestions generator
frontend/src/types.ts          - Added ActionableSuggestion interface
frontend/src/components/GapAnalysis.tsx - Checkboxes + Apply button
frontend/src/components/ATSExplainability.tsx - Props pass-through
frontend/src/components/CVTextEditor.tsx - Wire up apply handler
backend/main.py                - Added suggest-skills endpoint
```

---

## Testing

1. Start services (backend :8000, frontend :5173)
2. Create/open a job with ATS analysis
3. View Gap Analysis section - see green "Actionable Suggestions" panel
4. Check suggestions, click "Apply Selected" to add to CV
5. AI Skill Suggester button now works in JobDetail view
