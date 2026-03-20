# Project Diary — Entry 075

**Date**: 2026-03-20
**Track**: 4.0 — Application Intelligence (pre-work)
**Ideas completed**: #562, #564

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 4.0 — Application Intelligence (epic #21, ready to start with #493)
- **Last session**: Added Mistral as a second LLM provider alongside Gemini (budget pressure). Full E2E tested and working. Also fixed a Mistral-specific bug where injected keywords were wrapped in markdown bold.
- **Next steps**: Start #493 (Job Lifecycle: Stage transition timestamps and audit log) — first idea in Epic #21.
- **Blocked/broken**: Nothing
- **Ideas backlog**: Epic #21 (10 ideas, ~33h) queued and ready

---

## Session — Mistral LLM provider (#562, #564)

### Motivation

Gemini API budget being exceeded. Added Mistral (via Mistral platform API) as a fully supported, switchable LLM backend so either provider can be used for all AI features.

### Architecture

The `LLMBackend` abstract class in `src/llm_backend.py` already had `GeminiBackend`, `OllamaBackend`, and `LlamaCppBackend`. Adding Mistral followed the same pattern.

Mistral's API is OpenAI-compatible, so `MistralBackend` uses `requests` directly against `https://api.mistral.ai/v1/chat/completions` — no new SDK dependency. Default model: `mistral-small-latest`.

### Changes made

**`src/llm_backend.py`**
- Added `MistralBackend` class
- Updated `LLMBackendFactory` to handle `'mistral'` type
- Added Mistral to the `main()` test harness

**`backend/main.py`**
- Added `mistral` to `BackendType` enum
- Added `mistral_api_key` / `mistral_model` fields to `BackendConfig`
- Added `_build_backend_config()` helper — replaces 6 identical `if/elif` backend config blocks across the file
- Added `_default_cloud_backend()` helper — returns Gemini if `GEMINI_API_KEY` set, else Mistral, avoiding hardcoded defaults
- Updated health check (`/`) to include `mistral` in `backends_available`
- Updated `/api/backends` endpoint to include Mistral with available models
- Changed `load_dotenv()` to `load_dotenv(..., override=True)` so `.env` always wins over stale system env vars
- Replaced 2 hardcoded `"gemini"` defaults with `_default_cloud_backend()`

**`frontend/src/types.ts`**
- Added `mistral: boolean` to `HealthStatus.backends` interface

**`frontend/src/components/Dashboard.test.tsx`**
- Added `mistral: false` to mock health fixture (TypeScript now requires it)

**`.env.example`**
- Added `MISTRAL_API_KEY=your-mistral-api-key-here`

### Bug fixed — #564: Mistral bold-formats injected keywords

Mistral wraps keywords it injects with `**bold**` markdown markers (e.g. `As a senior **Programme Manager**...`). Gemini does not. Root cause: the `incorporate_keywords` prompt said "preserve existing formatting" but didn't forbid adding new markdown. Fixed by adding an explicit rule:

> "Do NOT add bold (`**text**`), italic (`*text*`), or any other markdown formatting to injected keywords — match the plain-text style of the existing CV"

### Debugging note — Windows zombie processes

During testing, `load_dotenv` wasn't picking up the new `MISTRAL_API_KEY` because the running uvicorn process had a zombie parent (PID invisible to tasklist but holding the port). Uvicorn's `--reload` doesn't re-read `.env` on non-Python file changes. Resolution: kill the zombie via `taskkill /F /PID <pid> /T` and start fresh. The `override=True` change also ensures future restarts always pick up `.env` changes.

### Files changed

- `src/llm_backend.py`
- `backend/main.py`
- `frontend/src/types.ts`
- `frontend/src/components/Dashboard.test.tsx`
- `.env.example`
- `src/ats_optimizer.py` (bug #564)

### Commits

*(see git log)*
