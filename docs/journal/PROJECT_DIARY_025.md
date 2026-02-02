# Project Diary 025 - LLM-Assisted CV Improvement

**Date**: 2 February 2026
**Focus**: LLM-Assisted CV Improvement from ATS Checklist (#122)
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 — LLM-Assisted CV Improvement complete
- **Last session**: Completed #122. Full-stack feature: select missing ATS keywords, LLM incorporates them into CV, returns changelog. Debugged ghost socket issue blocking endpoint. Temporarily on port 8001.
- **Next steps**: #124 (quick bug fix — blank labels), #123 (LLM picker for suggestions), then #104 (per-component testing strategy) or #79 (ATS explainability UI)
- **Blocked/broken**: Port 8000 has ghost socket — using 8001 temporarily. `vite.config.ts` proxy points to 8001, revert after reboot.
- **Ideas backlog**: #122 done. New: #123, #124. Pipeline: #124 (quick win), #123, #79, #104

---

## Idea #122 — LLM-Assisted CV Improvement (COMPLETE)

This diary entry documents the successful implementation of Idea #122, focusing on LLM-assisted CV improvement from an ATS checklist. This feature enhances the user's ability to tailor their CV to specific job descriptions by incorporating missing keywords and addressing weak skills using an LLM.

The full feature has been implemented across the stack:

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | Added `incorporate_keywords()` method — LLM prompt with structured `===CHANGELOG===` separator, conservative temp 0.3, no-fabrication rules |
| `backend/main.py` | Added `ApplySuggestionsRequest` model + `POST /api/jobs/{job_id}/apply-suggestions` endpoint. Parses changelog from LLM output, strips preamble, returns `backend_type`/`model_name`/`changelog` |
| `frontend/src/types.ts` | Added `ApplySuggestionsResponse` interface |
| `frontend/src/api.ts` | Added `applySuggestions()` function |
| `frontend/src/components/SuggestionChecklist.tsx` | **New file** — interactive checklist with keyword + weak skill selection, select all/none, "Apply Selected" button |
| `frontend/src/components/CVTextEditor.tsx` | Integrated SuggestionChecklist, applying state, changelog populates change summary field |
| `frontend/src/components/MissingKeywordsAlert.tsx` | Added `defaultCollapsed` prop |

## The Ghost Socket Incident

This incident is worth documenting as a lesson in debugging environmental issues. After implementing #122, the newly created endpoint returned a 404 error, despite the code being present and seemingly correct. Initial debugging efforts by Gemini confirmed:
- The endpoint code was correctly present in `backend/main.py`.
- The `WORKFLOW_AVAILABLE` flag was set to `True`.
- There were no duplicate `main.py` files causing conflicts.
- The endpoint definition itself was syntactically correct.

Gemini's diagnosis was sound—the problem was environmental, not code-level, and it concluded it couldn't proceed further without being able to run `curl` directly to fully test the network layer.

The **root cause**, later identified, was a dead Python process (PID 12484) that had left a "ghost" TCP socket open on port 8000. This process did not appear in standard process listings (`tasklist` or `Get-Process`), but `netstat` still showed the port as LISTENING. New `uvicorn` instances, when started on port 8000, could bind to the port (due to `SO_REUSEADDR`), but incoming HTTP requests were erroneously being routed to the defunct, dead socket instead of the active `uvicorn` process. This was proven by starting the backend on port 8001, where the endpoint functioned immediately.

**Fix**: As a temporary measure, the application was switched to run on port 8001, and the `vite.config.ts` proxy target was updated accordingly. This change will need to be reverted back to port 8000 after a system reboot or once the ghost socket fully clears from the operating system's network stack.

**Lesson for future debugging**: When API endpoints exist in the codebase but consistently return 404 on a seemingly fresh server start, it is critical to investigate whether multiple processes are bound to the same port. Use `netstat -ano | findstr :<PORT> | findstr LISTENING` to identify all processes listening on the target port. On Windows, in particular, dead processes can sometimes retain control of sockets for extended periods, leading to obscure network routing issues.

## New Ideas Added

- **#123 — LLM backend picker for Apply Suggestions**: Allow the user to choose the LLM model for applying suggestions, instead of hardcoding it from the job.
- **#124 — Fix blank Backend/Created labels on application overview page**: Address a bug where these labels appear blank on the application overview page.
