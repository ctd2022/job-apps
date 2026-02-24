# Project Diary 042 - Streamline JobDetail UX

**Date**: 24 February 2026
**Focus**: Progressive disclosure restructure of JobDetail page
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `streamline-ux`
- **Track**: UX polish — JobDetail progressive disclosure
- **Last session**: Restructured JobDetail into 4 zones; Gap Analysis and GapFillWizard now immediately visible in a "Next steps" card; all deep analysis collapsed behind a single "Full Analysis" accordion.
- **Next steps**: Pick next item from ideas backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing outstanding at high priority

---

## What Was Done

### JobDetail.tsx — Progressive Disclosure Layout

Restructured the flat 15–20 panel layout into four clear zones:

- **Zone 1 (Header)**: Unchanged — back link, status box, info bar, Edit CV / View JD buttons
- **Zone 2 (Score)**: Unchanged — ATS score + tier badge, MatchHistoryTable
- **Zone 3 (Next steps)**: NEW — always visible when `atsAnalysis.gap_analysis` is present. Light card containing `GapAnalysis` and `GapFillWizard` directly, no accordion. This is the primary action path.
- **Zone 4 (Full Analysis)**: Single `CollapsibleSection` starting closed. Contains `MatchExplanationCard`, `ATSExplainability` (with `hideGapAnalysis={true}`), `ExtractedSkillsList`, `EvidenceStrengthPanel`, `MissingKeywordsAlert`, `CVCompletenessMeter`, AI Skill Suggester.

Also removed the redundant "New Application" / "View All Applications" footer buttons — navigation is already available in the header.

### ATSExplainability.tsx — hideGapAnalysis prop

Added optional `hideGapAnalysis?: boolean` prop. When `true`, suppresses the embedded `<GapAnalysis>` render. Used when rendering inside Zone 4 to prevent duplication (Zone 3 already shows it).

### start.bat — Quickstart script

Created `start.bat` at project root: launches backend (uvicorn, port 8000) and frontend (Vite, port 5173) in separate CMD windows with a 2-second stagger. Gitignored — local convenience only.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/JobDetail.tsx` | Zone 3 + Zone 4 restructure, remove footer, add GapAnalysis import |
| `frontend/src/components/ATSExplainability.tsx` | Add `hideGapAnalysis` prop |
| `.gitignore` | Add `start.bat` |
