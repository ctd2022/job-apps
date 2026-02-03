# Project Diary 029 - Fix semantic gap leaking internal messages to UI

**Date**: 03 February 2026
**Focus**: Fix semantic gap leaking internal messages to UI (#125, #126)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: track2.8-semantic-ats
- **Track**: Track 2.9.5 COMPLETE
- **Last session**: Fixed a bug where internal semantic scorer messages were displayed as semantic gaps in the UI by returning empty gaps and gating the semantic gaps section with a new `semanticAvailable` prop.
- **Next steps**: Nothing. Task complete.
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing notable

---

## Summary

This session addressed a bug identified in ideas #125 and #126, where internal error messages from the `semantic_scorer.py` (e.g., "sentence-transformers not installed") were being incorrectly displayed as actual semantic gaps in the frontend UI. The fix involved two main parts:

1.  **Backend (`src/semantic_scorer.py`):** Modified the `calculate_semantic_score` method to return an empty list (`gaps=[]`) instead of internal status messages when `sentence-transformers` is not installed or the embedding model fails to load. The `available=False` flag already correctly indicates the unavailability of semantic scoring.

2.  **Frontend (`frontend/src/components/GapAnalysis.tsx` and `frontend/src/components/ATSExplainability.tsx`):**
    *   `GapAnalysis.tsx` was updated to include an optional `semanticAvailable` prop. The `hasSemanticGaps` check now uses this prop to gate the rendering of the Semantic Gaps section, ensuring it only displays when semantic analysis was genuinely available and returned actual gaps.
    *   `ATSExplainability.tsx` was modified to pass the `semantic_analysis.available` status as the `semanticAvailable` prop to the `GapAnalysis` component.

These changes prevent internal system messages from being presented to the user as meaningful semantic gaps, improving the clarity and accuracy of the Gap Analysis UI.

All TypeScript checks (`npx tsc --noEmit`) and Vitest tests (`npx vitest run`) passed without introducing any new errors or regressions. Ideas #125 and #126 have been marked as 'Done' in `ideas.db`.