# Project Diary 047 — Idea #238: Inject Contact Header on Pull from Profile

**Date**: 2026-02-26
**Branch**: main

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Implemented Idea #238 — "Pull from Profile" now also injects a formatted contact header (name, email, phone, location, linkedin, website) at the top of the CV textarea, eliminating false-positive contact warnings in CV Coach.
- **Next steps**: No immediate follow-on — consider Idea backlog for next priority.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Nothing notable.

---

## What Was Built

**Idea #238: Inject Contact Header on Pull from Profile** — when the user clicks "Pull from Profile" in any CV editor, the personal info from their CandidateProfile is now prepended as a formatted contact block at the top of the CV text.

### Problem
`handlePullFromProfile()` only injected job history (the experience section). It ignored `full_name`, `email`, `phone`, `location`, `linkedin`, `website`. CV Coach was flagging missing contact info as a false positive even though the user had entered those details in their profile.

### Solution
Extended the `GET /api/profile/assemble-cv` backend endpoint to also fetch the profile and return a pre-formatted `contact_header` string. The frontend strips any existing header (via HTML comment markers) before prepending the new one, making the operation idempotent.

### Files Changed

| File | Change |
|------|--------|
| `backend/cv_assembler.py` | Added `format_contact_header(profile: dict) -> str` |
| `backend/main.py` | Extended `assemble_cv` endpoint to fetch profile + call `format_contact_header` |
| `frontend/src/api.ts` | Updated `assembleCV()` return type to include `contact_header: string` |
| `frontend/src/components/CVTextEditor.tsx` | Added `stripContactHeader()` helper; updated `handlePullFromProfile()` |
| `frontend/src/components/CVManager.tsx` | Same changes as CVTextEditor |

### Contact Header Format

```
<!-- CONTACT_START -->
David Smith
david@example.com | +44 7700 000000 | London, UK
linkedin.com/in/david | davidsmith.dev
<!-- CONTACT_END -->
```

- Only non-null fields appear
- Markers allow idempotent re-pull (strip + re-inject)
- Empty string returned if profile has no personal info (safe no-op)

### TypeScript
`npx tsc --noEmit` — clean, no errors.

---

## Verification Steps

1. Ensure profile has name/email/phone/location filled in
2. Open a CV, click "Pull from Profile"
3. Verify contact header appears at top with correct fields
4. Click "Pull from Profile" again — header replaced, not duplicated
5. Open CV Coach — no false-positive contact warnings
