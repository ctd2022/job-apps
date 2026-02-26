# Project Diary 048 — Pull from Profile in CV Coach + URL space fix

**Date**: 2026-02-26
**Branch**: main

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Added "Pull from Profile" button to CV Coach; fixed space-in-LinkedIn-URL bug (two-layer: output normalisation + save-time normalisation); cleaned stored value in DB directly.
- **Next steps**: Consider ideas backlog for next priority.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Nothing notable.

---

## Changes This Session

### 1. Pull from Profile added to CV Coach

The "Pull from Profile" button previously existed only in CVTextEditor and CVManager. Added it to CV Coach too, in the footer bar (left of the change summary input).

**Behaviour**: identical to the other editors — injects contact header + experience section, strips old contact block first (idempotent), then triggers debounced re-assessment so the score updates immediately.

**File changed**: `frontend/src/components/CvCoach.tsx`

---

### 2. LinkedIn/website URL space bug fix

**Bug**: Profile had `www.linkedin.com/in/ david-pottinger-04494825` (space after `/in/`) stored in the DB, causing the contact header to render the URL with a space.

**Root cause**: The space was entered during profile save (likely a paste artefact). `.strip()` only removes leading/trailing whitespace, not internal spaces.

**Fix (two layers)**:

| File | Fix |
|------|-----|
| `backend/cv_assembler.py` | `re.sub(r"\s+", "", ...)` on linkedin/website before writing to header |
| `backend/job_store.py` | Strip spaces from linkedin/website fields at save time in `update_profile()` |

**DB cleanup**: Used `PUT /api/profile` (user `3a5fc648`) to re-save the corrected URL directly via curl.

---

### Note: Contact header and New Application

Clarified expected behaviour: "Pull from Profile" modifies the in-memory textarea only. You must **Save** the CV after pulling for the stored CV to include the contact header. New Application uses the stored CV from the database.

The PII scrubber strips `full_name`, `email`, `phone`, `location` before the LLM and restores them afterwards — so the contact header is transparent to the workflow. `linkedin` and `website` pass through to the LLM as-is (public info, not sensitive PII).
