# Project Diary 051 — CV Coach Writing Quality Batch (#51 #52 #53 #43)

**Date**: 2026-02-26
**Branch**: main

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Added four writing quality checks to CV Coach: essential sections (#51), active voice (#52), buzzword detector (#53), word repetition (#43). All regex/list-based, no LLM. New `style` suggestion category introduced.
- **Next steps**: **#100 Auto-Suggest Keywords** (P5, High complexity) — highest priority remaining idea. Surfaces where existing CV experience maps to JD requirements but is buried or undersells. Plugs into existing hybrid ATS scoring infrastructure.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Next priority: #100 Auto-Suggest Keywords → #78 Enhanced Gap Analysis → #55 Summary Generator → #93 Guided Evidence Question.

---

## Changes This Session

### Ideas #51, #52, #53, #43 — CV Coach Writing Quality Batch

**Motivation**: CV Coach had five coaching categories covering structure, evidence, and impact. Writing quality — passive voice, clichés, repetition, missing sections — was entirely unchecked. These are common reasons CVs fail both ATS and human review.

**Approach**: Pure regex/list-based, following exactly the same pattern as Idea #45 (Quantified Impact Checker). All checks live in `backend/main.py` and fire as new entries in `_generate_coach_suggestions()`. No LLM dependency, no new API calls.

---

### Backend — `backend/main.py`

**Module-level additions** (constants + three helper functions, placed before `_generate_coach_suggestions`):

**`_PASSIVE_PHRASES`** (compiled regex):
- Matches: `responsible for`, `involved in`, `tasked with`, `worked on`, `helped to`, `assisted with`, `participated in`, `was/were responsible`, `was/were involved`
- Case-insensitive

**`_BUZZWORDS`** (list of 28 phrases):
- Includes: `team player`, `synergy`, `results-driven`, `self-starter`, `detail-oriented`, `proactive`, `passionate`, `dynamic`, `forward-thinking`, `thought leader`, `guru`, `ninja`, `rockstar`, `wizard`, `evangelist`, `game changer`, `cutting-edge`, `world-class`, `excellent communication skills`, `deep dive`, etc.

**`_STOP_WORDS`** (set of ~50 common English words):
- Used by repetition checker to filter out noise (articles, prepositions, pronouns, etc.)

**`_check_active_voice(cv_text)`**:
- Counts matches against `_PASSIVE_PHRASES`
- 2–3 matches → `low` priority suggestion
- 4–5 matches → `medium`; 6+ → `high`
- `section_hint: 'experience'`

**`_check_buzzwords(cv_text)`**:
- Case-insensitive substring search across `_BUZZWORDS`
- 1–2 found → `low`; 3–4 → `medium`; 5+ → `high`
- Shows up to 3 examples in message
- `section_hint: 'general'`

**`_check_word_repetition(cv_text)`**:
- Extracts all 4+ character words (lowercase), filters stop words
- Flags words appearing 5+ times
- Requires 2+ such words to fire (avoids false positives on short CVs)
- `low` priority unless top word appears 8+ times (then `medium`)
- `section_hint: 'general'`

**Updated `_generate_coach_suggestions()`**:
- New parameter: `has_summary: bool`
- New suggestion: missing Summary/Profile section (`medium` priority, `completeness` category)
- Calls `_check_active_voice()`, `_check_buzzwords()`, `_check_word_repetition()` at the end
- Suggestion cap raised from 8 → 10
- `import re` moved to module-level (was inline)

**Updated `assess_cv_coach` endpoint**:
- Computes `has_summary = any("summary" in n.lower() or "profile" in n.lower() or "objective" in n.lower() for n in section_names)`
- Passes `has_summary` to `_generate_coach_suggestions()`

---

### Frontend — `frontend/src/types.ts`

Extended `CoachingSuggestion.category` union:
```typescript
// before
category: 'evidence' | 'completeness' | 'formatting' | 'length' | 'impact';
// after
category: 'evidence' | 'completeness' | 'formatting' | 'length' | 'impact' | 'style';
```
No component changes required — suggestion cards render `category` as a label and style by `priority`.

---

## CV Coach Suggestion Categories (complete as of this session)

| Category | Checks |
|----------|--------|
| `completeness` | Missing experience, skills, education, projects, summary/profile |
| `evidence` | Skills without quantified evidence |
| `formatting` | No email address |
| `length` | Too short (<500 chars) or too long (>8000 chars) |
| `impact` | Experience bullets with no numbers/metrics |
| `style` | Passive voice · Buzzwords/clichés · Word repetition ← NEW |

---

## Commit

`e878e3a` — `feat: CV Coach writing quality checks — active voice, buzzwords, repetition, summary (#51 #52 #53 #43)`
