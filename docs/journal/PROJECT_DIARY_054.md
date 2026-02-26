# Project Diary — Entry 054

**Date**: 2026-02-26
**Idea**: #55 — Professional Summary Generator
**Status**: Done

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Added LLM-powered "Generate Summary" button to CV Coach (Idea #55). Writes a 3-4 sentence professional summary from CV text, optionally tailored to a pasted job description, and inserts it directly into the CV textarea.
- **Next steps**: Pick next idea from backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing notable flagged

---

## What Was Built

A "Generate Summary" button in the CV Coach footer that calls a new `/api/cv-coach/generate-summary` endpoint. The endpoint scrubs PII, sends the CV text (+ optional JD) to Gemini, and returns a 3-4 sentence summary that is inserted into the CV at the right position. CV Coach re-assesses automatically after insertion.

---

## Files Changed

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | Added `generate_summary()` method after `suggest_skills` |
| `backend/main.py` | Added `GenerateSummaryRequest` model + `POST /api/cv-coach/generate-summary` endpoint |
| `frontend/src/types.ts` | Added `SummaryGenerationResponse` interface |
| `frontend/src/api.ts` | Added `generateSummary()` function; updated imports |
| `frontend/src/components/CvCoach.tsx` | Added `Wand2` icon, `insertSummaryIntoCv()` helper, 4 state variables, `handleGenerateSummary()` handler, two-row footer JSX with inline JD textarea |

---

## Key Design Decisions

**PII scrub+restore**: The CV goes through `pii_scrubber.scrub()` before the LLM call and `pii_scrubber.restore()` after, so the candidate's real name/email/etc. appear in the generated summary rather than placeholders.

**Insertion logic** (`insertSummaryIntoCv`):
- Case A: Existing summary section detected by `SUMMARY_HEADER_RE` → replaces content between that header and the next `##` heading
- Case B: `<!-- CONTACT_END -->` marker present → inserts `## Professional Summary` block immediately after the contact block
- Case C: Fallback → prepends `## Professional Summary` at the top

**Two-click UX**: First click opens the JD textarea; second click (now labelled "Generate") fires the API call. Cancel link collapses without generating.

**Idempotent**: Running twice replaces the existing summary section (SUMMARY_HEADER_RE fires on second pass).

---

## LLM Prompt Design

- System role: "expert CV writer" with strict rules
- Banned words list: passionate, dynamic, results-driven, dedicated, motivated, self-starter, go-getter, team player, synergy, leverage, stakeholder
- No "I am a" sentence openers
- Output: plain text only, exactly 3-4 sentences
- Temperature: 0.5 (balanced quality + consistency)
- Max tokens: 300

---

## Verification

- TypeScript check: `npx tsc --noEmit` — passed clean
- Idea #55 marked Done in ideas.db

---

## PII Audit (post-implementation review)

Reviewed `pii_scrubber.py` and the new endpoint against the existing pattern. Confirmed:

- CV text is scrubbed (name, email, phone, location, employer names) before the LLM call ✓
- Only `scrub_result.scrubbed_text` is passed to `generate_summary()` — not raw CV ✓
- `pii_scrubber.restore()` is called on the raw LLM output before returning ✓
- `job_description` is passed to the LLM un-scrubbed — intentional; JDs are public documents containing no candidate PII ✓
- `linkedin`/`website` are not scrubbed — consistent with existing design; they're public identifiers and won't appear in generated prose ✓
- The first-person prompt instruction ("I bring...", "With X years...") means the LLM is unlikely to reference the candidate by name at all; scrub/restore is a safety net rather than a critical path dependency ✓
- Pre-existing limitation (not introduced here): scrubber uses exact string match, so name variations not caught if CV differs from profile field — consistent across all endpoints, not a regression
