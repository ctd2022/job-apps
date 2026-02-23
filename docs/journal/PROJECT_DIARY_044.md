# Project Diary 044 - JD Red-flag Detector (Idea #32)

**Date**: 23 February 2026
**Focus**: Idea #32 — JD Red-flag Detector
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track-jd-intelligence`
- **Track**: JD Intelligence — #58 done, #32 done, #23 remains
- **Last session**: Shipped Idea #32 — LLM-powered JD red-flag panel in JobDetail, independent of CV/ATS
- **Next steps**: Implement #23 (JD Section Extraction / structured parsing)
- **Blocked/broken**: Nothing
- **Ideas backlog**: #23 still open on this branch

---

## What Was Built

### Idea #32 — JD Red-flag Detector

A new analysis pass runs over the raw JD text during job processing (independent of the ATS toggle). It surfaces red flags and green flags in a new collapsible panel above the ATS match section.

**Categories detected:**
- `unrealistic_requirements` — experience demands vs tech age, contradictory seniority signals
- `culture_warning` — hustle language ("rockstar", "fast-paced", "wear many hats")
- `scope_overload` — one role across too many domains, vague catch-all duties
- `transparency` — no salary, vague responsibilities, missing team/reporting info

**Output per flag:** severity (high/medium/low), title, detail, evidence quote from JD (optional).

**Overall risk level:** low / medium / high / critical — panel auto-expands on high/critical.

---

## Files Changed

| File | Change |
|------|--------|
| `src/jd_analyzer.py` | NEW — `JDAnalyzer` class: prompt builder + structured block parser |
| `backend/job_store.py` | `jd_analysis TEXT` column migration + `save_jd_analysis` / `get_jd_analysis` |
| `backend/main.py` | Import `JDAnalyzer`; run after CV generation; `GET /api/jobs/{id}/jd-analysis` |
| `frontend/src/types.ts` | `JDRedFlag`, `JDGreenFlag`, `JDAnalysisData` interfaces |
| `frontend/src/api.ts` | `getJDAnalysis()` function |
| `frontend/src/components/JDRedFlagPanel.tsx` | NEW — panel with severity-coloured cards, evidence quotes, green flags |
| `frontend/src/components/JobDetail.tsx` | Fetch JD analysis in parallel; render panel above `MatchExplanationCard` |

---

## Design Notes

- **Prompt strategy**: structured labelled blocks (`RED_FLAG:`, `CATEGORY:`, `SEVERITY:`, etc.) separated by `---`. Parser is regex-based, not JSON — more resilient to LLM variation.
- **Non-fatal**: JD analysis failure is caught and logged; it never blocks job completion.
- **Storage**: stored as JSON in `jd_analysis TEXT` column; fetched via dedicated endpoint.
- **Frontend**: fetches for all completed jobs (regardless of ATS), catches gracefully if absent.

---

## Commit

`dd30b9d` — `feat: add JD red-flag detector panel (Idea #32)`
