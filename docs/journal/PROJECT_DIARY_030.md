# Project Diary 030 - CV Manager, Semantic Scoring, Gemini Guardrails

**Date**: 03 February 2026
**Focus**: CV Manager page (#81), semantic gap fixes (#125, #126), sentence-transformers install
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5
- **Last session**: Built CV Manager page (#81), fixed semantic gap message leak (#125/#126), installed sentence-transformers so hybrid scoring now works at full 55/35/10 weighting. Reviewed and repaired Gemini damage from #33, added guardrails to GEMINI.md.
- **Next steps**: See recommendations below. Top candidates: #23 (ATS Confidence Score), #56 (AI Skills Suggester), or cleaning up pre-existing TS warnings.
- **Blocked/broken**: Nothing. All systems operational.
- **Ideas backlog**: #81, #33, #125, #126 all done. `sentence-transformers` now installed.

---

## Summary

### CV Manager Page (#81) — Claude

New dedicated `/cvs` page for managing CVs outside the application flow:

| File | Change |
|------|--------|
| `backend/main.py` | `PUT /api/cvs/{cv_id}/name` rename endpoint |
| `frontend/src/api.ts` | `renameCV()` function |
| `frontend/src/components/CVManager.tsx` | New full-page component |
| `frontend/src/App.tsx` | Route + nav item |

Features: list, upload, rename (inline), delete (with confirm), set default, edit content (modal), expand version history.

### Pipeline Diagnosis (#33) — Gemini (with repairs)

Gemini implemented the diagnosis feature correctly but made out-of-scope destructive changes. See diary 028 for full repair details. Added two new GEMINI.md rules to prevent recurrence.

### Semantic Gap Fix (#125, #126) — Gemini

Clean implementation. `semantic_scorer.py` no longer leaks internal messages into gap data. `GapAnalysis.tsx` now gates the semantic section on `semanticAvailable` prop. Gemini stayed in scope this time — the new guardrails worked.

### sentence-transformers Installed

Was never installed, so semantic scoring (35% of hybrid score) was always 0%. Now working correctly. Key lesson: uvicorn `--reload` doesn't pick up new pip installs — requires full process restart.

---

## Recommendations: What's Next

| Priority | Idea | Rationale |
|----------|------|-----------|
| 1 | Clean up pre-existing TS warnings | 7 warnings in `NewApplication.tsx` (unused imports, dead components). Quick win, reduces noise for future `tsc` checks. |
| 2 | #23 ATS Confidence Score | Show users how reliable the ATS score is — now that semantic scoring works, confidence will be higher. Medium complexity. |
| 3 | #56 AI Skills Suggester | Leverage the now-working semantic analysis to suggest skills the user should add. Builds on existing ATS infrastructure. |
| 4 | #30 Follow-up Automation | Practical job-hunting utility — remind user to follow up after submission. |
