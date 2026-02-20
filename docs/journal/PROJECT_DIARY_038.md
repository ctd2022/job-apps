# Project Diary 038 - Gemini Test Handover Review & LLM Model Persistence

**Date**: 2026-02-12
**Track**: 2.9.5 - CV Editor UX (maintenance)

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 complete — maintenance/testing phase
- **Last session**: Reviewed Gemini's test handover (3/9 done, cleaned up). Captured LLM model persistence bug as idea #170. Updated TODO.md for Gemini round 2.
- **Next steps**: Gemini round 2 for remaining 6 tests (TODO.md ready). Implement idea #170. Pick next feature from backlog.
- **Blocked/broken**: Nothing
- **Ideas backlog**: #170 (Persist LLM model - P5 bug), #124 (Live Score Preview), #33 (Pipeline Diagnosis)

---

## Gemini Test Handover Review

Gemini was tasked (via TODO.md) with writing unit tests for 9 untested frontend components. It completed 3 before hitting loop detection.

### What Gemini Delivered

| Component | Status |
|-----------|--------|
| PipelineDiagnosis | Created, needed fixes |
| FilePreview | Created, needed fixes |
| ApplicationHistory | Created, needed fixes + source reverts |

### Issues Found and Fixed

| Issue | Fix |
|-------|-----|
| Modified `ApplicationHistory.tsx` (added data-testids) | Reverted — violates "DO NOT modify source" |
| Modified `tsconfig.json` (added vitest/globals types) | Reverted — violates "DO NOT modify config" |
| Missing `vi` and `beforeEach` imports from vitest | Added explicit imports |
| Mock data used `null` for optional `string` fields | Changed to `undefined` / omitted |
| Fragile `getByText` assertions hitting multiple elements | Switched to regex/structural queries |
| Repeated edit failures ("could not find string") | Gemini guessed file contents instead of reading first |

**Result after cleanup**: 17 test files, 114 tests, zero TS errors.

### TODO.md Updated for Round 2

Rewrote with 7 specific lessons from round 1 mistakes, reduced scope (6 remaining components), updated test pattern with correct imports, and emphasis on running tests after each file.

---

## Idea #170: Persist LLM Model Per Job

User discovered on a second machine (weaker GPU, using `llama3.2:3b`) that the model selected at job creation is lost. All subsequent LLM calls use hardcoded defaults (`llama3.1:8b`).

**Root cause**: Only `backend_type` is stored in the job record. `backend_model` is passed to the workflow but never persisted.

**Affected endpoints**: `/rematch`, `/apply-suggestions`, `/suggest-skills` — all use hardcoded model defaults per backend type.

**Proposed fix**: Add `backend_model` column to jobs table, populate on creation, read in all subsequent LLM calls. Low complexity, high impact.

---

## Gemini Session Stats

| Metric | Value |
|--------|-------|
| Wall time | 50m 1s |
| Agent active | 19m 48s |
| Tool calls | 122 (110 ok, 12 failed — 90.2%) |
| Code changes | +1,317 / -876 lines |
| Model | gemini-2.5-flash |
| Input tokens | 4M + 21M cache reads |
| Output tokens | 88K |
| Claude cleanup | ~5 min, ~10 tool calls |

**Effective cost**: ~55 minutes total agent time (both agents) for 3 clean test files.

**Token note**: 4M input + 21M cache for 3 test files is heavy. Caused by Gemini looping on edit failures and rewriting whole files. Round 2 TODO.md instructs "run tests after EACH file" to fail fast.

---

## Gemini Delegation Lessons (Updated)

Building on diary 037's lessons:

1. **Gemini struggles with iterative fix cycles** — edit failures cascade when it guesses file contents
2. **Scope creep** — expanded from 9 to 34 tasks during execution
3. **Source modification rule needs reinforcement** — despite explicit prohibition, modified source and config
4. **3 of 9 per session is realistic** for medium-complexity test writing
5. **Lessons-in-TODO format** should improve round 2 success rate
6. **Token cost is high** — 25M tokens (input + cache) for partial completion; fail-fast strategy should reduce this
