# Project Diary — Entry 066

**Date**: 2026-03-10
**Track**: 3.1 — UX Polish
**Branch**: `main`
**Commits**: `404f2a9`, `ba9173b`, `989f4a8`, `4fbfdf8`

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Implemented Idea #298 (Profile as CV source) and Idea #302 (collapsible results page with inline CV/cover letter previews). Fixed Gemini `'parts'` error (safety-blocked responses now surface a human-readable message).
- **Next steps**: Continue UX Polish track — check ideas backlog for next priority.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Nothing urgent flagged.

---

## Session Summary

### Idea #298 — Profile as CV Source in New Application (commits `404f2a9`, `ba9173b`)

Previously implemented (carried forward from session 065). The New Application form now has a third CV mode — **Profile** — alongside Saved and Upload. When selected, the CV is assembled live from the candidate's profile data (contact header, summary, work history, education, certifications, skills, professional development).

A side-fix (`ba9173b`) ensured the assembled CV is also saved as a stored CV version so that `cv_version_id` is set — required for job detail features like the CV editor, rematch, and gap-fill to work correctly.

---

### Idea #302 — Application Results Page: Collapsible Sections (commit `989f4a8`)

The post-generation results page was a flat list: score bar + file tabs. Restructured into named collapsible sections, all expanded by default:

1. **ATS Score** — score bar + tier badge
2. **Tailored CV** — inline markdown preview + Word doc download link in header
3. **Cover Letter** — same structure
4. **Other Files** — ATS analysis, metadata etc. via existing FilePreview component

**Implementation notes:**
- `ResultSection` sub-component (collapsible, with optional `headerRight` slot for the Word doc link)
- `loadPreviewsForJob(jobId, files)` called from the `onComplete` callback — fetches `.md`/`.txt` content for CV and cover letter files immediately after job completes
- `collapsedSections` Record state; all start as `false` (expanded)
- Word doc download links use `getJobFileUrl` + `download` attribute; `stopPropagation` prevents toggle on click
- `resetForm` clears all new state
- Files: `frontend/src/components/NewApplication.tsx`

---

### Bug Fix — Gemini `'parts'` KeyError (commit `4fbfdf8`)

**Symptom**: Jobs failed with cryptic error `'parts' Failed`.

**Root cause**: When Gemini safety-filters or blocks a response, it can return a candidate with a `content` object but no `parts` key. The raw `result['candidates'][0]['content']['parts'][0]['text']` access raised `KeyError: 'parts'`, which `str(e)` rendered as `'parts'` — surfaced to the user verbatim.

**Fix** (`src/llm_backend.py`): Defensive response parsing — checks `parts` safely via `.get()`, reads `finishReason` and `promptFeedback.blockReason`, and raises a human-readable `RuntimeError` like `"Gemini blocked response (SAFETY). Try rephrasing or switching model."` Also handles prompt-level blocking (no `candidates` key).
