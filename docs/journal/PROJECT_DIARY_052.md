# Project Diary 052 — Surface Hidden Strengths: Keyword Placement (Idea #100)

**Date**: 2026-02-26
**Branch**: main

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Implemented Idea #100 (Auto-Suggest Keywords). New "Surface Hidden Strengths" panel in JobDetail ATS view. Surfaces skills the candidate already has but is underselling — no fabrication, pure restructuring advice.
- **Next steps**: **#78 Enhanced Gap Analysis** (P4) — extends 2.8.2 semantic infrastructure with critical gap list, semantic gap detection, and experience gap reporting. Then **#55 Summary Generator** (P4) — LLM-based CV summary/profile section generation.
- **Blocked/broken**: Nothing. Note: keyword_placement suggestions only appear for jobs that have stored ats_details (jobs run after Track 2.9.2). Older jobs show "None".
- **Ideas backlog**: #78 Enhanced Gap Analysis → #55 Summary Generator → #93 Guided Evidence Question → #34 STAR Behavioral Coach.

---

## Changes This Session

### Idea #100 — Auto-Suggest Keywords / Surface Hidden Strengths

**Motivation**: The existing ATS view already showed missing keywords (what to add) and evidence gaps (what to strengthen). But it didn't distinguish between "you don't have this" and "you have this but it's buried". #100 fills that gap: show candidates where their existing experience maps to JD requirements but is positioned poorly.

**Design principle**: These are restructuring suggestions, not fabrication prompts. Every suggestion points to something already in the CV.

---

### Backend — `backend/main.py`

**New function `_generate_placement_suggestions(ats: dict) -> list[dict]`**:

Takes the stored `ats_details` JSON (already fetched for the ATS analysis endpoint) and derives three types of suggestions:

| Type | Signal | Advice |
|------|--------|--------|
| `skills_only` | Skill in `skills_matches` but NOT in `experience_matches` or `projects_matches` | Demonstrate it in an Experience bullet |
| `projects_not_experience` | Skill in `projects_matches` but NOT in `experience_matches` | Promote to Experience — experience carries more ATS weight |
| `weak_evidence` | Skill in `evidence_gaps.weak_evidence_skills` (not already flagged above) | Add a metric or outcome |

Priority rules:
- `skills_only` + JD required → `high`; otherwise → `medium`
- `projects_not_experience` + JD required → `medium`
- `weak_evidence` + JD required → `medium`
- Max 10 suggestions, sorted high→medium→low then alphabetically
- Deduplication: `weak_evidence` skips skills already in `skills_only`/`projects_not_experience`

**No DB changes** — computed on-the-fly from the stored `ats_details` JSON.

**Updated `GET /api/jobs/{job_id}/ats-analysis`**: injects `keyword_placement` field into the analysis object before returning.

**Updated `POST /api/jobs/{job_id}/rematch`**: also injects `keyword_placement` into `ats_details` in the response (not stored to DB — computed fresh each time).

---

### Frontend — `types.ts`

New interface:
```typescript
export interface PlacementSuggestion {
  type: 'skills_only' | 'projects_not_experience' | 'weak_evidence';
  priority: 'high' | 'medium' | 'low';
  skill: string;
  message: string;
  section_hint: string;
}
```
`ATSAnalysisData` extended with `keyword_placement?: PlacementSuggestion[]`.

---

### Frontend — `KeywordPlacementSuggestions.tsx` (new component)

- Uses `CollapsibleSection` (consistent with other ATS panels)
- Auto-expands if any `high` priority suggestions exist
- Badge count + violet colour for high, amber for medium-only
- Each suggestion card: left border colour by priority, type badge (violet/blue/amber), skill name, message
- Empty state: "Your key skills are well demonstrated across your CV sections."
- Footer note: "These are strengths you already have — restructuring costs nothing."

**Icon mapping**:
- `skills_only` → `TrendingUp` (move up)
- `projects_not_experience` → `Layers` (promote across)
- `weak_evidence` → `BarChart2` (add metrics)

---

### Frontend — `JobDetail.tsx`

`KeywordPlacementSuggestions` inserted **above** `MissingKeywordsAlert` — "you have this, surface it" comes before "you're missing this". Both only render when `atsAnalysis` is present.

---

## Commit

`f6353f1` — `feat: surface hidden CV strengths via keyword placement suggestions (Idea #100)`
