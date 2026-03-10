# Project Diary — Entry 069

**Date**: 2026-03-10
**Track**: 3.1 — UX Polish
**Ideas completed**: #310

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Redesigned light mode with a softer, warmer stone-based colour palette (Idea #310).
- **Next steps**: Continue UX Polish — check ideas backlog.
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing notable

---

## Idea #310 — Soft Light Mode Palette

**Problem**: Light mode used harsh pure-white card surfaces and a `slate-800` header that looked identical to dark mode, making it uncomfortable to use without switching to dark mode.

**Approach**: Design token layer via `@layer utilities` in `index.css`, plus a targeted header fix in `App.tsx`. Zero component files touched.

### Changes

**`frontend/src/index.css`**
- Body background changed from `slate-100` to `stone-100`
- Added `@layer utilities` block scoped to `html:not(.dark)` remapping the full surface hierarchy:

| Class | Light mode value |
|---|---|
| `bg-white` | `stone-50` — warm off-white |
| `bg-slate-50` | `stone-100` — soft secondary surface |
| `bg-slate-100` | `stone-200` — buttons, badges |
| `bg-slate-200` | `stone-300` — hover states, progress bars |
| hover variants | follow same mapping |
| `border-slate-200` | `stone-300` — softer dividers |

**`frontend/src/App.tsx`**
- Page container: `bg-slate-100` → `bg-stone-100`
- Header: `bg-slate-800 border-slate-700` → `bg-slate-600 border-slate-500` (dark mode unchanged at `slate-950`)

### Why this approach

130+ surface colour usages across 30 component files ruled out per-component edits. The `@layer utilities` override is intentional and documented — it's the design-token pattern without needing a full CSS variable refactor. Dark mode is completely unaffected since all rules are scoped to `html:not(.dark)`.
