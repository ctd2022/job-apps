# Project Diary — Entry 057

**Date**: 2026-02-27
**Ideas**: #239 — Summary highlight; #242 — Position Profiling (Phases 1–3)
**Status**: Done

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Completed Idea #239 (scroll-to + select inserted summary text in CV Coach) and delivered Idea #242 (Position Profiling) across all 3 phases — backend aggregation, History checkbox UI, and the full `/position-profile` analysis page.
- **Next steps**: Explore Phase 2 of Position Profiling (optional LLM narrative button); or pick next feature from backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: #242 Phase 2 (LLM narrative) is a natural next step; STAR Coach (#34), Mock Interviewer (#35) still in Idea state

---

## What Changed

### Idea #239 — Highlight inserted summary in CV Coach

After "Generate Summary" inserts text into the CV textarea, the textarea now:
1. Scrolls to the inserted paragraph
2. Selects it for 2 seconds so the user can see exactly where it landed

**Implementation**: `pendingHighlight` state in `CvCoach.tsx`. Set immediately after `insertSummaryIntoCv()` returns the character offset. A `useEffect` keyed on `pendingHighlight` runs after React commits the new value, calls `setSelectionRange`, computes scroll position from line count × line height, then clears the selection after 2s via `setTimeout`.

---

### Idea #242 — Position Profiling (all 3 phases)

Cross-references the user's matched jobs to reveal what the market consistently asks for vs. their CV coverage.

#### Phase 1 — Backend

**DB migration**: `include_in_profile INTEGER DEFAULT 1` added to `jobs` table via idempotent `ALTER TABLE`. All 52 existing jobs opted in; 32 have ATS data.

**`JobStore.set_profile_include(job_id, include)`**: Toggles the flag with ownership check.

**`JobStore.get_position_profile(user_id)`**: Aggregates `ats_details` JSON from included jobs:
- Collects `jd_required_skills`, `jd_preferred_skills`, `matched_keywords`, `missing_keywords` per job
- Frequency-counts all JD terms; tracks how many jobs each skill was matched in
- Thresholds: appears in ≥25% of jobs (floor 2); `consistent_gaps` = freq ≥40% + match_rate <50%; `strengths` = freq ≥2 + match_rate ≥70%
- Returns: `skill_frequency[]`, `consistent_gaps[]`, `strengths[]`, `role_distribution[]`, `corpus_jobs[]`
- Zero LLM cost — pure frequency math on stored JSON

**New endpoints**:
- `PATCH /api/jobs/{id}/profile` — toggle `include_in_profile`
- `GET /api/position-profile` — returns aggregate profile

Real data (32 jobs): primary target = Programme Manager; top strengths = delivery, programme, project management (100% match rate); 0 consistent gaps.

#### Phase 2 — History checkbox

- `types.ts`: `include_in_profile?: boolean` on `Application`
- `api.ts`: `normalizeApplication` passes through the flag; `toggleProfileInclude(jobId, include)` calls PATCH endpoint
- `ApplicationHistory.tsx`: `BarChart2` icon column header with tooltip; per-row checkbox for jobs with ATS score (optimistic toggle, reverts on API failure); jobs without ATS show `–`

#### Phase 3 — Position Profile page

**`PositionProfile.tsx`** at `/position-profile`:
- Insight headline auto-generated from data (top role, top strength, top gap if any)
- Role type chips with count badges
- Skill frequency table: split bar (green = matched, red = missed in that job), frequency count, match rate badge (Strong/Partial/Gap)
- Consistent gaps cards with link to CV Coach
- Strengths chips with match % annotation
- Collapsible corpus jobs list (each links to JobDetail)
- Empty/few-job states with guidance

**App.tsx**: `BarChart2` "Roles" nav item + `/position-profile` route.

---

## Key Behaviours

- All existing jobs default to `include_in_profile=1` — immediate value on first visit
- Only jobs with `ats_score` show a checkbox in History (others can't contribute)
- Minimum 3 jobs required for meaningful profile; warning shown below that threshold
- The aggregation is entirely client-side math on stored JSON — instant, free, deterministic
- "Manage selection in History →" link keeps the two pages connected
