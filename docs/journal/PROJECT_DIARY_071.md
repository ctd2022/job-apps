# Project Diary — Entry 071

**Date**: 2026-03-13
**Track**: 3.1 — UX Polish
**Ideas completed**: #311, #312, #313

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Completed three UX polish ideas: pound sterling icon for salary (#311), privacy footer cleanup (#312), and dashboard pagination + pill styling (#313).
- **Next steps**: Pick from ideas backlog — top candidate is #59 (Job title-based bullet suggestions, P5).
- **Blocked/broken**: Nothing
- **Ideas backlog**: #59 (P5, Feature), #34 STAR Behavioral Coach (P4), #37 Answer Reuse Engine (P4)

---

## Ideas #311 & #312 — Salary icon + privacy footer (previous session)

These were completed at end of the last session (2026-03-11) and committed to main:
- #311: Replaced text "£" with `PoundSterling` Lucide icon in the salary field
- #312: Removed redundant "Local storage" text from the privacy footer

---

## Idea #313 — Dashboard pagination + pill styling

**Problem**: Recent Applications showed a flat list capped at 8 — no way to see older entries without going to the full history page. Status/backend badges were plain rectangles with no dark mode coverage.

**Approach**: Simple `visibleCount` state (starts at 8, +8 per click) rather than full page navigation — keeps it lightweight for a dashboard. Pill styling aligned across all badges.

### Changes

| File | Change |
|------|--------|
| `frontend/src/components/Dashboard.tsx` | `visibleCount` state replaces hardcoded `slice(0,8)`; "Show more (N remaining)" button; `rounded-full font-medium` on all pills; `STATUS_CONFIG` extended with full dark mode variants |

### Key behaviours
- `visibleCount` persists across the 3-second polling cycle — expanding the list won't snap back on each refresh
- "Show more" button shows exact remaining count
- All 7 outcome statuses now have dark mode pill colours
- Active-job status and backend badges also updated to rounded style

---
