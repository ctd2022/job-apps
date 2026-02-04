# Project Diary 033 - Fix Backend Dropdown Regression

**Date**: 04 February 2026
**Focus**: Bug fix — backend selector dropdown empty on New Application page
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5
- **Last session**: Fixed regression where backend dropdown on New Application page was empty. Root cause: `aeb7d2f` ("Remove dead code") stripped a load-bearing fallback that unwrapped the `{backends: [...]}` API response envelope.
- **Next steps**: #23 (ATS Confidence Score), #56 (AI Skills Suggester), or #30 (Follow-up Automation)
- **Blocked/broken**: Nothing
- **Ideas backlog**: No changes

---

## Root Cause

`GET /api/backends` returns `{"backends": [...]}` (wrapped in `BackendListResponse`), but `getBackends()` in `api.ts` returned the raw object. The original `NewApplication.tsx` compensated:

```typescript
const backendList = Array.isArray(data) ? data : (data?.backends || []);
```

Commit `aeb7d2f` ("refactor: Remove dead code from NewApplication.tsx (#127)") simplified this to:

```typescript
const backendList = Array.isArray(backendData) ? backendData : [];
```

This removed the `?.backends` fallback, so the wrapped response was treated as empty.

## Fix

Moved the unwrapping into `api.ts` where it belongs — `getBackends()` now normalizes the response before returning:

```typescript
export async function getBackends(): Promise<Backend[]> {
  const response = await fetch(`${API_BASE}/backends`);
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : data.backends ?? [];
}
```

**File changed**: `frontend/src/api.ts` (1 line)

## Lesson

Response envelope unwrapping belongs in the API layer, not in components. When the component handled it, it looked like dead code and got removed. The type signature (`Promise<Backend[]>`) masked the mismatch.
