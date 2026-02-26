# Project Diary 049 — Quantified Impact Checker (Idea #45)

**Date**: 2026-02-26
**Branch**: main

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Implemented Idea #45 — Quantified Impact Checker. Added a new `impact` coaching suggestion category to CV Coach that detects experience bullets lacking measurable metrics.
- **Next steps**: Consider **Idea #100 — Auto-Suggest Keywords** (Pri 5, High complexity) or **Idea #55 — Summary Generator** (Pri 4, Medium).
- **Blocked/broken**: Nothing.
- **Ideas backlog**: #100 (Pri 5, High) — auto-suggest keywords from ATS; #55 (Pri 4, Medium) — CV summary generator.

---

## Changes This Session

### Idea #45 — Quantified Impact Checker

**Motivation**: CV Coach had four coaching categories (`evidence`, `completeness`, `formatting`, `length`). The existing "Weak Evidence" suggestion flags skills not backed by ATS entities — but doesn't catch experience bullets that are simply vague (no numbers, percentages, or outcomes). This is a common CV weakness that ATS tools and human reviewers both penalise.

**Approach**: Pure regex, no LLM. Parse the experience section from raw CV text, extract bullet lines, then flag bullets that contain no digit at all.

---

### Backend — `backend/main.py`

**New helper `_extract_experience_bullets(cv_text)`**:

- Splits CV text into lines and scans for an experience section header (`EXPERIENCE|Work Experience|Employment`, case-insensitive).
- Collects lines inside that section that start with a bullet char (`-•*–`) or are 5+ words long and don't match date patterns (`Jan|Feb|…` or `\b(19|20)\d{2}\b`).
- Stops when a new all-caps section header is encountered.

**Updated `_generate_coach_suggestions()`**:

- After the existing length checks, calls `_extract_experience_bullets()` and filters for bullets with no digit (`re.search(r'\d', b)`).
- If 2+ vague bullets found: appends an `impact` suggestion with:
  - `high` priority if 4+ vague bullets, `medium` if 2–3.
  - Message includes count and a truncated (60-char) example bullet.
  - `section_hint: 'experience'` so the Jump-to-section link works.

---

### Frontend — `frontend/src/types.ts`

Extended the `CoachingSuggestion.category` union:

```typescript
// before
category: 'evidence' | 'completeness' | 'formatting' | 'length';
// after
category: 'evidence' | 'completeness' | 'formatting' | 'length' | 'impact';
```

No component changes required — suggestion cards render `category` as plain text and style by `priority`, so `"impact"` displays automatically.

---

### Verification

- TypeScript check (`npx tsc --noEmit`): clean, exit 0.
- Idea #45 marked Done in `ideas.db`.

---

## Commits

| Hash | Message |
|------|---------|
| `4925464` | `feat: add Quantified Impact Checker to CV Coach (Idea #45)` |
