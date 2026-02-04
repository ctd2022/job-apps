# TODO.md - Agent Handover

**Status**: PENDING
**Date**: 04 February 2026
**From**: Claude (Lead Architect)
**To**: Gemini (Implementation)
**Idea**: #127 — Clean up pre-existing TypeScript warnings in NewApplication.tsx

---

## Overview

`npx tsc --noEmit` reports 7 errors in `NewApplication.tsx`. All are unused declarations — dead code that should be removed. No logic changes needed.

---

## Errors to Fix

```
src/components/NewApplication.tsx(6,3):  TS6133: 'Building2' is declared but its value is never read.
src/components/NewApplication.tsx(7,3):  TS6133: 'Server' is declared but its value is never read.
src/components/NewApplication.tsx(12,3): TS6133: 'ChevronDown' is declared but its value is never read.
src/components/NewApplication.tsx(14,3): TS6133: 'Save' is declared but its value is never read.
src/components/NewApplication.tsx(66,84): TS2339: Property 'backends' does not exist on type 'never'.
src/components/NewApplication.tsx(724,10): TS6133: 'CompactDropZone' is declared but its value is never read.
src/components/NewApplication.tsx(807,10): TS6133: 'FileDropZone' is declared but its value is never read.
```

---

## Task 1: Remove unused icon imports (lines 6, 7, 12, 14)

**File**: `frontend/src/components/NewApplication.tsx`

Remove `Building2`, `Server`, `ChevronDown`, and `Save` from the lucide-react import block (lines 3-17). Keep all other icons — they are used.

Current:
```typescript
import {
  Upload,
  FileText,
  Building2,
  Server,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Save,
  Star,
  Trash2
} from 'lucide-react';
```

Target:
```typescript
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Star,
  Trash2
} from 'lucide-react';
```

---

## Task 2: Fix type inference on line 66

**File**: `frontend/src/components/NewApplication.tsx`

Line 66:
```typescript
const backendList = Array.isArray(backendData) ? backendData : (backendData?.backends || []);
```

The `.backends` property access triggers TS2339 because `getBackends()` returns `Backend[]`, so the non-array branch is typed as `never`. The `?.backends` fallback is dead code from an old API shape.

**Change to**:
```typescript
const backendList = Array.isArray(backendData) ? backendData : [];
```

This preserves the defensive array check while removing the dead property access.

---

## Task 3: Delete unused `CompactDropZone` component (lines 724-805)

**File**: `frontend/src/components/NewApplication.tsx`

Delete the entire `CompactDropZone` function (lines 724-805). It is defined but never used anywhere in the codebase.

---

## Task 4: Delete unused `FileDropZone` component (lines 807-914)

**File**: `frontend/src/components/NewApplication.tsx`

Delete the entire `FileDropZone` function (lines 807 to end of file). It is defined but never used anywhere in the codebase.

---

## Scope — Only this file

| File | Change |
|------|--------|
| `frontend/src/components/NewApplication.tsx` | Remove 4 unused imports, simplify line 66, delete 2 dead components |

**Total: 1 file. ~200 lines removed, ~1 line changed.**

---

## Out of Scope — Do NOT Touch

- Any other files
- Any other components
- Any test files
- Backend code
- Database or ideas.db (Claude will update idea status)
- Diary entries (Claude will write the diary)

---

## Acceptance Criteria

- [ ] `cd frontend && npx tsc --noEmit` — zero errors (currently 7)
- [ ] `cd frontend && npx vitest run` — all existing tests pass
- [ ] No other files modified
- [ ] No new code added — this is purely a deletion/cleanup task
- [ ] Write a short completion summary at the top of this file

---

## REMINDER: Scope Boundaries

**Only modify `frontend/src/components/NewApplication.tsx`.** Do not add new imports, new components, or new functionality. This is a cleanup task — remove dead code only. See GEMINI.md for full rules.

---

**End of handover**
