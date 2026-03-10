# Project Diary — Entry 068

**Date**: 2026-03-10
**Track**: 3.1 — UX Polish
**Branch**: `main`
**Commits**: `6597837`

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 3.1 — UX Polish
- **Last session**: Implemented profile editing architecture (ADR-001), SlidingPanel shell, and the Gap Analysis experience panel.
- **Next steps**: Check ideas backlog for next UX polish task.
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Check `ideas.py list --project job_applications` for next item.

---

## Session Summary

### Ideas #306, #305, #304 — Profile Editing Architecture + SlidingPanel + Gap Analysis Experience Panel (commit `6597837`)

#### Idea #306 — Profile Editing Architecture ADR

Created `docs/ADR-001-profile-editing.md` formalising the three-tier editing surface taxonomy:

| Tier | Surface | Where |
|------|---------|-------|
| 1 | Canonical Editor | `/profile` page — all CRUD including delete/reorder |
| 2 | Contextual Quick-Actions | Non-Profile pages — fire-and-confirm toast / navigate-with-hint / inline routing prompt |
| 2.5 | Contextual Structured Edit | Right drawer (desktop) / bottom sheet (mobile) — add + edit only, no delete |
| 3 | Free-Text Fine-Tuning | CV Coach / CV Editor — application-specific working copy |

Key decision rule hierarchy:
1. Data fully known + atomic write → fire-and-confirm (Tier 2)
2. User must type, no context needed → navigate-with-hint (Tier 2)
3. User must type + needs current context → panel (Tier 2.5)
4. Delete / reorder / multi-section / many fields → Tier 1

CV → Profile upward sync is allowed only for: `<!-- JOB:id -->` marker sync (automatic) and summary "Sync to Profile" button (explicit). No silent sync for any other section.

---

#### Idea #305 — SlidingPanel Shell

`frontend/src/components/SlidingPanel.tsx`:

- Props: `open`, `onClose`, `title`, `subtitle?`, `children`
- Desktop (`lg` / 1024px+): fixed right drawer, 440px wide, z-40
- Mobile: bottom sheet, full width, `max-h-[80vh]`, drag handle, rounded-t-xl
- Backdrop click and Escape key both close the panel
- No scroll lock on the underlying page (user can read context behind panel on desktop)

---

#### Idea #304 — Gap Analysis Experience Panel

**Three-part implementation:**

**`WorkExperiencePanelBody.tsx`** (section-specific body):
- Props: `skill`, `jobs: JobHistoryRecord[]`, `onJobUpdated`, `onClose`
- Collapsed list of job rows (title + employer + date range)
- Expanding a row shows inline edit form for `description` and `details` only
- Employer / title / dates are read-only (edit those in Profile)
- Save calls `updateJobHistoryRecord()`, calls `onJobUpdated`, collapses the row
- "Done" button fires `onClose`

**`GapAnalysis.tsx`** changes:
- Added `onOpenExperiencePanel?: (skill: string) => void` prop
- Added `expandedExperienceKey: string | null` state
- Experience suggestions now use two-step inline routing prompt:
  1. Checking the row expands an amber inline card showing advice text and "Open Work Experience" button
  2. "Open Work Experience" calls `onOpenExperiencePanel(skill)`, marks the row done, closes the expansion
  3. "Dismiss" collapses the expansion without taking action
- Fallback: if `onOpenExperiencePanel` not provided, falls back to navigate-with-hint (backward-compat)

**`JobDetail.tsx`** changes:
- Added `showExperiencePanel`, `panelSkill`, `jobHistory` state
- `handleOpenExperiencePanel(skill)`: lazily loads job history on first open, sets panel state
- `handleJobUpdated(updated)`: updates the local job history list on save
- `handlePanelClose()`: clears panel state, calls `loadJob()` to trigger ATS re-run
- `<GapAnalysis>` now receives `onOpenExperiencePanel={handleOpenExperiencePanel}`
- `<SlidingPanel>` + `<WorkExperiencePanelBody>` rendered after the CV Text Editor modal

**TypeScript**: clean (`npx tsc --noEmit` — no errors).

---

## Architecture Notes

- `SlidingPanel` is intentionally a structural shell only. Section-specific bodies (`WorkExperiencePanelBody`, future `SkillsPanelBody`, etc.) are separate components — no generic body interface, per ADR-001.
- Panel Z-index is z-40 (backdrop z-30) — above nav, below any z-50 modals.
- ATS re-run on panel close is achieved by calling `loadJob()` which already fetches the latest ATS analysis for completed jobs.
