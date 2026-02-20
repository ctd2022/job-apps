# Project Diary 035 - Ideas Kanban Attempt (Rolled Back)

**Date**: 05 February 2026
**Focus**: Ideas Kanban/Sprint Board View (#122)
**Status**: ROLLED BACK

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: Track 2.9.2 Core UX
- **Last session**: Gemini attempted #122 implementation; rolled back due to enum mismatch bug.
- **Next steps**: Re-attempt #122 with correct status enum, or proceed with other features.
- **Blocked/broken**: Nothing
- **Ideas backlog**: Idea #122 reset to "Idea" status.

---

## Summary

Gemini implemented the Ideas Kanban feature (#122) but the implementation had a critical bug causing the `/api/ideas` endpoint to return 500 Internal Server Error.

### Root Cause

The `IdeaStatus` enum in `backend/main.py` didn't match actual values in `ideas.db`:

| Enum defined | DB actually has |
|--------------|-----------------|
| `Idea` | `Idea` |
| `In Progress` | `Planned` |
| `Done` | `Done` |
| `Cancelled` | `Deferred` |

Pydantic validation failed when serializing rows with `Planned` or `Deferred` status.

### Decision

Full rollback chosen over patching. Changes reverted:
- `backend/main.py` - removed `/api/ideas` endpoint
- `frontend/src/App.tsx` - removed route and nav item
- `frontend/src/api.ts` - removed `getIdeas()`
- `frontend/src/types.ts` - removed `Idea` interface
- `frontend/src/components/IdeasKanban.tsx` - deleted
- Idea #122 status reset from "Done" to "Idea"

### Lesson

When delegating to Gemini, include actual data samples (e.g., `SELECT DISTINCT status FROM ideas`) in the handover, not just schema assumptions. The TODO.md spec assumed status values that didn't exist in the database.
