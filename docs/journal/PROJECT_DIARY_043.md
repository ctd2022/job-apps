# Project Diary 043 - Bug Fixes: User Dropdown & Gap-Fill Save

**Date**: 24 February 2026
**Focus**: Two UX bug fixes surfaced during manual testing
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `streamline-ux`
- **Track**: UX polish — post-JobDetail-restructure bug fixes
- **Last session**: Fixed user dropdown not loading on app start, and gap-fill CV editor save button being disabled.
- **Next steps**: Pick next item from ideas backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing outstanding at high priority

---

## What Was Done

### Bug 1: User dropdown empty on start.bat launch

**Symptom**: Opening the app via `start.bat` showed an empty user dropdown.

**Root cause**: `start.bat` only waited 2 seconds before starting the frontend. Python/uvicorn can take 3–5+ seconds to fully initialise. If the user opened the browser before the backend was ready, the single `getUsers()` call on mount failed silently (`.catch(console.error)`), leaving `users = []` with no retry.

**Fixes**:
- `start.bat`: increased stagger from `timeout /t 2` to `timeout /t 6`
- `App.tsx`: wrapped `getUsers()` in a retry loop — retries up to 3 times with 2-second intervals if the call fails. Cancels cleanly on unmount.

### Bug 2: Gap-fill CV editor save button disabled

**Symptom**: After completing the Gap-Fill Wizard, the CV editor opened but "Save New Version" was greyed out.

**Root cause**: The save button is gated on `isDirty = content !== originalContent`. `loadVersion()` sets `content = initialContent` (LLM output) and `originalContent = v.content` (DB content). In edge cases where the LLM returned near-identical content to the original, `isDirty` evaluated to `false` and the button was disabled.

The backend does **not** auto-save — the gap-fill endpoint returns `revised_cv` as plain text only. The save was always the user's responsibility; the UI just wasn't letting them.

**Fix** (`CVTextEditor.tsx`):
- Added `hasPendingGapFill` state, initialised to `true` when `initialContent` is provided
- `isDirty = hasPendingGapFill || content !== originalContent`
- `hasPendingGapFill` is cleared to `false` after a successful save
- This ensures the save button is always enabled when the editor is opened from a gap-fill result, regardless of content similarity

---

## Files Changed

| File | Change |
|------|--------|
| `start.bat` | Timeout 2s → 6s (gitignored, not committed) |
| `frontend/src/App.tsx` | Retry logic for `getUsers()` on mount (up to 3 retries, 2s apart) |
| `frontend/src/components/CVTextEditor.tsx` | `hasPendingGapFill` flag keeps save enabled after gap-fill |
