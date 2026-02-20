# Project Diary 037 - AI Skill Suggester in CV Editor & Right Pane Cleanup

**Date**: 2026-02-07
**Track**: 2.9.5 - CV Editor UX

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 complete - CV Editor UX improvements
- **Last session**: Added AI Skill Suggester to CVTextEditor right pane (Idea #128), audited all 7 right-pane sections for duplication, removed MissingKeywordsAlert and MatchExplanationCard as redundant. Fixed Gemini's broken FormattingTipsPanel tests. Wrote Gemini handover for batch unit tests (9 components).
- **Next steps**: Hand off to Gemini for batch unit tests (TODO.md ready), then continue with remaining ideas
- **Blocked/broken**: Nothing
- **Ideas backlog**: #124 (Live Score Preview), #104 (Per-Component Testing Strategy - in progress via Gemini)

---

## Session Summary

### Idea #128 - AI Skill Suggester in Edit CV Panel

Surfaced the AI Skill Suggester (previously only in JobDetail) into the CVTextEditor right pane. Users can now see LLM-inferred skill suggestions while actively editing their CV.

| File | Changes |
|------|---------|
| `frontend/src/components/CVTextEditor.tsx` | Added `suggestSkills` API call, state, handlers, CollapsibleSection UI |

### Right Pane Deduplication Audit

Audited all 7 right-pane sections for overlap. Found two major redundancies:

| Removed | Reason |
|---------|--------|
| `MissingKeywordsAlert` | Same data as SuggestionChecklist (interactive), but read-only — adds nothing |
| `MatchExplanationCard` | Simplified version of ATSExplainability — fully superseded |

Right pane reduced from 7 to 5 sections:
1. ScoreComparisonPanel (conditional)
2. SuggestionChecklist (interactive keyword apply)
3. AI Skill Suggester (LLM-inferred skills)
4. ATSExplainability (detailed score breakdown + gap analysis)
5. CVCompletenessMeter (structural CV health)

### FormattingTipsPanel Test Fix

Gemini's test file had 11 failures — every test used short content that triggered multiple rules simultaneously. Rewrote tests with a clean baseline content (>500 chars, email, dates, all headings) and selective mutations per test case. All 95 tests now pass.

### Gemini Handover

Wrote TODO.md for batch unit tests covering 9 untested components, prioritised by complexity (Low/Medium/High), with pattern references and per-component test cases.

---

## Files Changed

```
frontend/src/components/CVTextEditor.tsx  - AI Skill Suggester + removed redundant panels
frontend/src/components/__tests__/FormattingTipsPanel.test.tsx - Rewrote broken tests
TODO.md - Gemini handover for batch unit tests
```

---

## Testing

- `npx tsc --noEmit` — clean
- `npx vitest run` — 14 files, 95 tests pass
