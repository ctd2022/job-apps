# Project Diary 045 - ATS Confidence Score (Idea #23)

**Date**: 23 February 2026
**Focus**: Idea #23 — ATS Confidence Score (Presentation Quality)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track-jd-intelligence`
- **Track**: JD Intelligence — #58 done, #32 done, #23 done
- **Last session**: Shipped Idea #23 — Presentation Quality confidence score panel; all three ideas on this branch now complete
- **Next steps**: Merge `track-jd-intelligence` to `main`, or pick next idea
- **Blocked/broken**: Nothing
- **Ideas backlog**: Branch work complete; check ideas backlog for next priority

---

## What Was Built

### Idea #23 — ATS Confidence Score (Presentation Quality)

A complementary score to the existing ATS keyword match. Instead of "do my keywords match?" it asks "how clearly does my experience come through?" — derived entirely from existing analysis data with no new LLM calls.

**Score formula (0–100):**
| Component | Weight | Source |
|-----------|--------|--------|
| Evidence Quality | 40% | `evidence_analysis.average_strength`, normalised from 0–2 scale |
| Communication Clarity | 40% | `hybrid_scoring.semantic_score` (when available), else lexical coverage proxy |
| Coverage | 20% | `matched / total` |

**Narrative thresholds:**
| Score | Message |
|-------|---------|
| ≥85 | "Your qualifications are well-presented for this role" |
| ≥70 | "Your experience communicates well for this role" |
| ≥55 | "Your qualifications come through moderately — there's room to improve" |
| <55 | "Several key qualifications aren't clearly coming through in your CV" |

Appends an actionable hint for the weakest component if it scores below 75.

**UI**: Collapsible "Presentation Quality" panel with score badge + narrative text + three labelled progress bars (green ≥75, yellow ≥55, red <55). Renders between the JD Red-flag panel and Match Explanation.

---

## Files Changed

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | `compute_confidence_score()` static method; `run()` now assigns result dict, appends confidence, returns |
| `backend/main.py` | Backfill for cached results — same pattern as `keyword_priorities` |
| `frontend/src/types.ts` | `ConfidenceData` interface; `confidence?` field on `ATSAnalysisData` |
| `frontend/src/components/ConfidenceScorePanel.tsx` | NEW — panel with narrative + 3 progress bars |
| `frontend/src/components/JobDetail.tsx` | Import and render `ConfidenceScorePanel` after JD Red-flag section |

---

## Design Notes

- **No new LLM calls**: all components derived from data already computed by `run()`.
- **Backfill**: cached results get confidence computed on first fetch, consistent with the `keyword_priorities` backfill pattern.
- **Static method**: `compute_confidence_score` is `@staticmethod` so it can be called from both `run()` and the backend backfill without instantiating `ATSOptimizer`.
- **Fallback for clarity**: when semantic scoring is unavailable, uses lexical coverage as the clarity proxy rather than leaving the component undefined.

---

## Commit

`8837cff` — `feat: add ATS confidence score panel (Idea #23)`
