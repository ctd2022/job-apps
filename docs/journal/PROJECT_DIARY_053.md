# Project Diary — Entry 053

**Date**: 2026-02-26
**Feature**: Enhanced Gap Analysis — section badges + actionable advice (Idea #78)

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Implemented Idea #78 — enriched evidence gap cards with per-skill section badges and specific advice text, using already-stored `section_analysis` data without re-running analysis.
- **Next steps**: Pick next idea from backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: No new high-priority items flagged

---

## What Was Done

Evidence Gaps in the Gap Analysis panel previously showed a flat bullet list of skill names — no context about where they were in the CV or what to do about them.

### Approach

Post-processed stored `ats_details` at query time (same pattern as `_generate_placement_suggestions` for Idea #100). No changes to `ats_optimizer.py`, fully backward-compatible.

### Backend (`backend/main.py`)

Added `_enrich_evidence_gaps(ats: dict) -> list[dict]` alongside `_generate_placement_suggestions`. For each weak-evidence skill, it:
1. Cross-references `section_analysis.experience_matches`, `skills_matches`, `projects_matches`
2. Builds a `found_in` list of sections where the skill appears
3. Generates an `advice` string based on the presence pattern:
   - Skills only → "Listed in Skills only — add an Experience bullet showing how you applied it"
   - Projects but not Experience → "Demonstrated in Projects — promote to Experience for higher ATS weight"
   - In Experience → "In Experience but lacks metrics — add quantified results"
   - Not found → "Add this skill with concrete examples to your Experience section"

Called in `GET /api/jobs/{job_id}/ats-analysis`, adding `evidence_gap_details` to the response.

### TypeScript (`frontend/src/types.ts`)

Added `EvidenceGapDetail` interface (`skill`, `found_in`, `advice`).
Extended `ATSAnalysisData` with `evidence_gap_details?: EvidenceGapDetail[]`.

### GapAnalysis.tsx

- Added `getSectionBadgeStyle()` helper (experience=green, skills=blue, projects=amber)
- Added `evidenceGapDetails?: EvidenceGapDetail[]` to `GapAnalysisProps`
- Evidence Gaps panel: when `evidenceGapDetails` provided, renders richer cards (skill name + section badge chips + advice text); falls back to flat list for old jobs

### JobDetail.tsx

Passes `evidenceGapDetails={atsAnalysis.evidence_gap_details}` to `<GapAnalysis>`.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/main.py` | Add `_enrich_evidence_gaps()`, call in ATS endpoint |
| `frontend/src/types.ts` | Add `EvidenceGapDetail`, extend `ATSAnalysisData` |
| `frontend/src/components/GapAnalysis.tsx` | Richer evidence gap cards |
| `frontend/src/components/JobDetail.tsx` | Pass prop to GapAnalysis |

**Commit**: `2e9d3bb`

---

## TypeScript Check

`npx tsc --noEmit` — no errors.
