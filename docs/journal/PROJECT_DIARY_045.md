# Project Diary 045 - CV Coach (Idea #229)

**Date**: 26 February 2026
**Focus**: New dedicated CV coaching page — job-agnostic, iterative, Grammarly-style live feedback
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track3.0-cv-coach`
- **Track**: Track 3.0 — CV Coach
- **Last session**: Built the full CV Coach page from scratch: backend assessment endpoint, animated score, live debounced feedback, suggestion cards with Jump-to-section, version history picker with one-click restore.
- **Next steps**: Pick from ideas backlog; possible enhancements to coaching suggestions (more targeted advice, LLM-generated tips)
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing outstanding at high priority

---

## What Was Done

### Context

Candidates were arriving at job-matching with whatever CV they happened to have. There was no dedicated place to improve the CV itself before applying. This session adds a full CV Coach page — job-agnostic (no JD required), reusing the existing ATS parsing infrastructure, surfaced in an interactive side-by-side editing experience.

---

### Backend: `POST /api/cv-coach/assess`

New endpoint that accepts raw CV text and returns a structured quality assessment using the existing `DocumentParser` — the same engine that powers ATS scoring.

**What it computes:**
- `quality_score` (0–100): completeness (skills, experience, education, projects, evidence) + evidence strength bonus
- `coaching_suggestions`: up to 8 prioritised actionable suggestions (high/medium/low) with a `section_hint` for jump-to navigation
- `evidence_analysis`: strong/moderate/weak skill counts, average evidence strength
- `section_analysis`: what was found in each CV section
- `parsed_entities`: hard skills, soft skills, years experience

**New models added to `backend/main.py`:**
- `CVCoachAssessRequest` — Pydantic model (`cv_text: str`)
- `_generate_coach_suggestions()` — helper that checks for missing sections, lack of email, short CV, weak evidence

---

### Frontend: `CvCoach.tsx` — Grammarly-style UX

The page was designed around best-of-breed interactive document feedback (Grammarly model):

**Live feedback as you type** — 1.5s debounce after each keystroke triggers a re-assessment. No button needed. The score and suggestion cards update automatically.

**Animated quality score** — the number counts up/down smoothly using `requestAnimationFrame` with ease-out cubic easing. Score dims to 40% opacity while a re-check is in flight.

**Suggestion cards** — colour-coded by priority (red=high, amber=medium, blue=low). Each card shows the issue, category, and a **Jump →** button that scrolls the textarea to the relevant section (searches for EXPERIENCE, SKILLS, EDUCATION, PROJECTS headers, or jumps to line 0 for contact).

**All-clear state** — when all suggestions resolve, the right panel shows a green check "Looking strong!" instead of blank space.

**Score bar** — shows score/100, label (Needs Work / Good / Strong), issue count, and a progress bar that transitions smoothly.

**No info-dump panels** — deliberately dropped CVCompletenessMeter, EvidenceStrengthPanel, ExtractedSkillsList from this view. The coaching cards replace them with actionable signal only.

---

### Version History Picker

A second dropdown (clock icon) appears in the header when a CV has multiple versions. All 36 existing versions are accessible, labelled as:

```
v35 · 24 Feb · LLM (gemini-2.0-flash)…
v34 · 20 Feb · LLM (llama3.1:8b)…
```

Selecting a version:
- Loads that version's content into the editor
- Fires an auto-assessment
- Pre-fills the change summary with "Restored from v{N}"
- Shows an amber banner with the version date and summary

The amber banner offers two options:
- **Restore as current** — one-click saves the old version as a new version (e.g. v37), no editing required
- **Back to current** — returns to v36 without saving

After restore, the version list refreshes automatically.

---

### Types & API

**`frontend/src/types.ts`** — two new interfaces appended:
```typescript
CoachingSuggestion { priority, category, message, section_hint }
CVCoachAssessment  { quality_score, parsed_entities, section_analysis,
                     evidence_analysis, coaching_suggestions,
                     sections_detected, cv_char_count }
```

**`frontend/src/api.ts`** — `assessCVCoach(cvText)` added.

**`frontend/src/App.tsx`** — CV Coach tab added as first nav item (`GraduationCap` icon), route `/cv-coach` wired.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/main.py` | `CVCoachAssessRequest` model, `_generate_coach_suggestions()` helper, `POST /api/cv-coach/assess` endpoint |
| `frontend/src/types.ts` | `CoachingSuggestion`, `CVCoachAssessment` interfaces |
| `frontend/src/api.ts` | `assessCVCoach()`, `CVCoachAssessment` import |
| `frontend/src/components/CvCoach.tsx` | **New** — full CV Coach page |
| `frontend/src/App.tsx` | Import, nav tab, route |

---

## Key Design Decisions

1. **No JD required** — the coach is job-agnostic. It uses the ATS parsing primitives (DocumentParser, entity extraction, evidence strength) but scores CV quality in isolation, not against a specific role.

2. **Debounced live assess over manual button** — eliminates the "click to check" friction. The 1.5s delay is long enough not to fire on every character but short enough to feel responsive after a paragraph edit.

3. **Jump-to-section over inline highlighting** — a contenteditable overlay (true inline highlighting) would require replacing the textarea with a custom editor. The Jump button achieves most of the value with a fraction of the complexity: it selects and scrolls to the relevant section header.

4. **Version restore in CV Coach, not CVManager** — the workflow of "find a good old version → load → compare score → restore" is a coaching activity. Putting it in CVManager would require navigating away mid-session.

5. **One-click restore** — old versions load into the editor fully editable. "Restore as current" is instant (no confirmation dialog). The version history itself is the undo mechanism.
