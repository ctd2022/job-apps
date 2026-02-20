# Project Diary 039 - Frontend Test Suite Completion & LLM Persistence Fix

**Date**: 20 February 2026
**Focus**: Unit tests for remaining components (#104), LLM model persistence (#170)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 complete — maintenance/testing phase
- **Last session**: Completed 6 frontend component test files (130 tests total), fixed LLM backend/model persistence via localStorage, aligned CLAUDE.md/GEMINI.md with programme templates, moved jobs.db to data/.
- **Next steps**: Pick next feature — #33 Pipeline Health Diagnosis or #82 Interactive CV gap-fill (both P5)
- **Blocked/broken**: Nothing
- **Ideas backlog**: #33 (Pipeline Diagnosis P5), #82 (CV gap-fill P5)

---

## What Was Done

### 1. Frontend test suite completed (#104)

Gemini (Round 2) delivered CVManager and Dashboard tests cleanly. NewApplication tests were delivered with bugs that Claude fixed:

| Bug | Fix |
|-----|-----|
| `within(el).querySelector()` — `within()` returns Testing Library queries, not DOM element | Changed to `el.querySelector()` directly |
| `getByRole('button', {name: /Upload/i})` finding multiple buttons | Changed to `getAllByRole(...).length >= 1` |
| Generate button disabled when no CV — error text never shown | Replaced with `expect(button).toBeDisabled()` |
| Mock calls `onComplete` synchronously — "Processing" state skipped | Simplified test to assert `createJob` called with correct args |
| Unused imports (`createCV`, `deleteCV`, `setDefaultCV`) | Removed |
| Missing `description` field in `Backend` mock data | Added |
| `Element` not assignable to `HTMLElement` for `within()` arg | Added `as HTMLElement` cast |

**Final result**: 20 test files, 130 tests, zero TS errors.

### 2. LLM backend/model persistence (#170)

Selected backend and model now persist across page loads via `localStorage`.

- State initialises from `localStorage.getItem('llm_backend')` (fallback: `'ollama'`)
- On load: restores saved model if it's still valid for the backend, otherwise uses backend default
- `handleBackendChange`: saves backend + new default model to localStorage
- Model `<select>` onChange: saves model to localStorage

### 3. jobs.db moved to data/

`DB_PATH` in `job_store.py` updated from project root to `data/jobs.db`. `.gitignore` updated from `jobs.db` to `data/`.

### 4. CLAUDE.md / GEMINI.md template alignment

- **CLAUDE.md**: Added Programme Feedback Loop section
- **GEMINI.md**: Added "Accessing Gitignored Files" section (Gemini can't use read_file on gitignored files — must use shell commands). Fixed ideas workflow from raw SQLite one-liners to programme CLI. Fixed `ideas.db` path reference.

---

## Lessons

- `within(el)` returns Testing Library query functions, not a DOM node — never call `.querySelector()` on it
- When a mock calls both `onProgress` and `onComplete` synchronously, React batches them — intermediate state may never render; test the side effect (API called) rather than the transient UI state
- A disabled `<button type="submit">` is the correct UX guard for incomplete forms — test `toBeDisabled()` rather than a validation error message that requires a click to trigger
