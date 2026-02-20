# Project Diary 031 - TS Cleanup, Gemini Guardrails v2, Unit Tests

**Date**: 04 February 2026
**Focus**: TypeScript dead code cleanup (#127), GEMINI.md guardrail improvements, unit tests for GapAnalysis and MissingKeywordsAlert
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5
- **Last session**: Cleaned up 7 TS errors in NewApplication.tsx (Claude + Gemini), added 3 new guardrails to GEMINI.md after Gemini went off-scope, then Gemini successfully wrote 16 unit tests for GapAnalysis and MissingKeywordsAlert.
- **Next steps**: #23 (ATS Confidence Score), #56 (AI Skills Suggester), or #30 (Follow-up Automation). Could also add `vitest --coverage` script.
- **Blocked/broken**: Nothing. 52 tests passing, zero TS errors.
- **Ideas backlog**: #127 done. Test coverage improving — 6 test files now (was 4).
- **Quick commands**:
  - Run tests: `cd frontend && npx vitest run`
  - Test coverage check: `cd frontend/src/components && for f in *.tsx; do name="${f%.tsx}"; if [ ! -f "__tests__/${name}.test.tsx" ]; then echo "UNTESTED: $f"; else echo "TESTED:   $f"; fi; done`

---

## Summary

### TS Warnings Cleanup (#127) — Gemini (with Claude repair)

Delegated to Gemini via TODO.md. Gemini completed ~90% correctly but made two errors:

| What Gemini did right | What went wrong |
|----------------------|-----------------|
| Removed 4 unused icon imports (`Building2`, `Server`, `ChevronDown`, `Save`) | Deleted `export default NewApplication;` at end of file |
| Fixed `.backends` type inference on line 66 | Started cascading — tried to "fix" the missing export by investigating `App.tsx` (out of scope) |
| Deleted `CompactDropZone` and `FileDropZone` (190+ lines of dead code) | Was about to remove `FileText` import (turned out correct, but was doing it for wrong reasons) |
| Deleted orphaned `formatFileSize` helper | — |

**Claude repair**: Re-added `export default NewApplication;`. Confirmed `FileText` removal was actually correct (only used in deleted `FileDropZone`). Final result: zero TS errors, 36 tests passing.

### GEMINI.md Guardrails v2 — Claude

Added 3 new rules to prevent recurrence of the cascading-error pattern:

1. **Commit rule clarified**: "Do not commit, stage, or push. Leave all changes as unstaged modifications for Claude to review." (was ambiguous before)
2. **Cascading error rule** (new MUST NOT): "If your change introduces a new error and fixing it requires touching an out-of-scope file — STOP and revert."
3. **Diff verification** (new completion checklist step): "Run `git diff --stat` and confirm only scoped files were modified."

**Lesson**: Gemini reverted these changes during its next session despite GEMINI.md being in the "do not modify" list. The rule exists but Gemini doesn't reliably obey it. Changes were re-applied by Claude after Gemini's session.

### Unit Tests — Gemini (clean success)

Second Gemini delegation designed as a confidence-builder: additive-only, no existing files to modify.

| Test file | Tests | Status |
|-----------|-------|--------|
| `GapAnalysis.test.tsx` | 8 | All passing |
| `MissingKeywordsAlert.test.tsx` | 8 | All passing |

Gemini followed the pattern from `EvidenceStrengthPanel.test.tsx` correctly. Mock data was well-typed, assertions matched component behaviour. No existing files modified. Test suite now at **52 tests across 6 files** (was 36 across 4).

**Lesson**: Gemini performs well on additive-only tasks with tight scope. The key success factors were: established pattern to follow, no existing code to modify, and clear acceptance criteria.

---

## Gemini Delegation Lessons (Cumulative)

| Session | Task type | Outcome | Key lesson |
|---------|-----------|---------|------------|
| Diary 028 | Feature impl (#33) | Partial — made destructive out-of-scope changes | Added first guardrails to GEMINI.md |
| Diary 029 | Bug fix (#125, #126) | Clean success | Guardrails worked; tight scope helped |
| Diary 031 | Code cleanup (#127) | 90% — cascaded on error | Added cascading-error rule, diff verification |
| Diary 031 | Unit tests (additive) | Clean success | Additive-only tasks are Gemini's sweet spot |

**Pattern**: Gemini succeeds when the task is (a) additive or (b) has a clear pattern to follow. It struggles when errors cascade and it needs to exercise judgement about scope boundaries.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/NewApplication.tsx` | Removed 5 unused imports, fixed line 66 type, deleted 2 dead components + helper (~200 lines) |
| `frontend/src/components/__tests__/GapAnalysis.test.tsx` | NEW — 8 unit tests |
| `frontend/src/components/__tests__/MissingKeywordsAlert.test.tsx` | NEW — 8 unit tests |
| `GEMINI.md` | 3 new guardrail rules (commit, cascading errors, diff verification) |
| `TODO.md` | Updated with test-writing handover, marked RESOLVED by Gemini |

---

## Metrics

- **TS errors**: 7 → 0
- **Test files**: 4 → 6
- **Total tests**: 36 → 52
- **Dead code removed**: ~200 lines
- **GEMINI.md rules**: added 3 new guardrails
