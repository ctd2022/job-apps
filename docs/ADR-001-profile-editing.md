# ADR-001: Profile Editing Architecture

**Date**: 2026-03-10
**Status**: Accepted
**Idea**: #306

---

## Context

The app has three distinct surfaces for editing profile data: the `/profile` page, contextual quick-actions on non-Profile pages, and the CV Coach free-text editor. Without a formal policy, it was unclear which surface owned which operation, leading to inconsistent behaviour (e.g. Gap Analysis suggestions sometimes navigating to the CV editor when Profile is the canonical store).

This ADR defines the rules governing all current and future editing surfaces.

---

## Decision: Three-Tier Editing Surface Taxonomy

### Tier 1 — Canonical Editor (`/profile`)

The only place where a user can create, edit, delete, or reorder any profile record with full field access.

**Rules:**
- All destructive operations (delete, reorder) happen here only.
- If a record has more than ~3 required fields, it must be created/edited here.
- Interaction patterns: inline form (personal info), centred modal overlay (jobs, certs, education, PD), inline chip edit (skills).

---

### Tier 2 — Contextual Quick-Actions (non-Profile pages)

Single-intent actions that write one record or one field to Profile in direct response to something the user is looking at. No complex form presented.

**Permitted patterns (in order of preference):**

1. **Fire-and-confirm toast** — call API, show timed toast. Use when the data is already fully known from context (e.g. skill name from a suggestion). Zero friction.
2. **Navigate-with-hint** — navigate to `/profile?param=value&hint=section` with amber banner + auto-scroll. Use when the user must type free text but doesn't need the current context visible simultaneously.
3. **Inline routing prompt** — a small expansion beneath the triggering row showing an action button before anything fires. Use when the action needs no form input but benefits from a confirm step.

**Hard rules for Tier 2:**
- May only write data it already knows — no asking for new text beyond a one-click confirm.
- May never delete records.
- May never open a modal.

---

### Tier 2.5 — Contextual Structured Edit (Panel)

A single-section structured editing form in a right drawer (desktop) or bottom sheet (mobile), opened from a contextual trigger on a non-Profile page.

**Use a Tier 2.5 panel when:**
- The user needs to type free text AND needs to see the current context simultaneously (e.g. gap list visible behind the panel).
- The action needs confirm/cancel.
- The user is mid-flow and navigate-with-hint would disrupt their review.

**Hard rules for Tier 2.5:**
- Single-section only (Work Experience, Skills, etc. — never mixed sections).
- Supports add and edit only — no delete, no reorder.
- Closes on "Done" (not on each individual row save).
- "Done" triggers any re-analysis needed in the parent (e.g. ATS re-run).

**Decision rule hierarchy:**
1. Data fully known + atomic write → fire-and-confirm (Tier 2).
2. User must type, no context needed → navigate-with-hint (Tier 2).
3. User must type + needs current context → panel (Tier 2.5).
4. Delete / reorder / multi-section / many fields → navigate to Tier 1.

---

### Tier 3 — Free-Text Fine-Tuning (CV Coach / CV Editor)

A working copy of the CV as assembled text. Changes here are application-specific fine-tuning — not canonical profile edits.

**Data flow rules:**
- **Profile → CV**: Pull from Profile is always safe and idempotent (replaces sections by marker/heading).
- **CV → Profile** upward sync is allowed only in these two named cases:
  1. `<!-- JOB:id -->` markers sync job details back on every save (current behaviour — keep it).
  2. Summary text syncs via the explicit "Sync to Profile" button only — never automatically.
- No silent upward sync for any other section.

**Mental model to preserve:**
- Profile = career record (edit here for any application).
- CV text = working draft for a specific application (edit here for this role).

---

## Implementation Notes

### `SlidingPanel` shell (Idea #305)

Shared structural component for Tier 2.5 panels.

- Props: `open`, `onClose`, `title`, `subtitle?`, `children`
- Desktop (`lg` / 1024px+): fixed right drawer, ~440px wide, slides in from right, semi-transparent backdrop.
- Mobile: bottom sheet, full width, drag handle, `max-h-[80vh]` with scroll.
- Backdrop click and Escape key close the panel.
- No scroll lock on the underlying page (user should read context behind panel on desktop).
- Z-index: above nav, below modals.

### Section-specific body components

Each panel section (Work Experience, Skills, etc.) is a separate component with its own props and fields. No generic panel body is built — each section's fields differ enough that internal branching would be harder to read than two separate components, and panels are small enough (under 150 lines each) that there is no scale argument for abstraction.

### Gap Analysis experience panel (Idea #304)

Two-step inline routing prompt for experience suggestions:
1. Checking an experience row expands it inline showing: skill name, advice, and "Open Work Experience" button.
2. Clicking "Open Work Experience" opens the `SlidingPanel` + `WorkExperiencePanelBody`.

`GapAnalysis.tsx` accepts `onOpenExperiencePanel?: (skill: string) => void`. `JobDetail.tsx` owns the panel state and passes the handler down, keeping `GapAnalysis` stateless with respect to the panel. Panel close triggers ATS re-run.

---

## Consequences

- Clear guidance for all future contextual editing features.
- No modal-in-modal patterns.
- Profile remains the single source of truth; no silent CV→Profile sync except the two named cases.
- Existing navigate-with-hint for experience suggestions is replaced by the panel flow (Tier 2 → Tier 2.5 upgrade).
