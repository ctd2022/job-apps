# Project Diary 041 - Pipeline Health Diagnosis UI

**Date**: 20 February 2026
**Focus**: Idea #33 — Pipeline Health stat chips and metric-driven variant logic
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 — ongoing polish
- **Last session**: Improved PipelineDiagnosis card — stat chips, metric-driven colours, loading skeleton.
- **Next steps**: Pick next item from ideas backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing outstanding at high priority

---

## What Was Done

### Idea #33 — Pipeline Health Diagnosis (`PipelineDiagnosis.tsx`)

Single-file change. The card already received `metrics` from the backend but only rendered text and used fragile string-matching for the icon/colour. Replaced with:

- **`getVariant()`** — derives one of five states (`start` / `warn` / `stuck` / `mixed` / `healthy`) from `total_submitted`, `interview_rate`, `offer_rate`
- **`VARIANT_STYLES`** — lookup table mapping variant → `{ Icon, iconClass, borderClass }`. No more string-matching.
- **`StatChip`** — inline helper component; renders three metric pills above the diagnosis text (applied count, interview %, offer %)
- **Loading skeleton** — `animate-pulse h-16` div instead of `return null`, so the card doesn't pop in abruptly
- **`rounded-lg`** added to the card (was missing)
- **Border colour** now follows the variant rather than being a fixed slate

TypeScript check passed with zero errors.

---

## Commits This Session

| Hash | Message |
|------|---------|
| `5a35611` | feat: Pipeline health stat chips and metric-driven variant logic (#33) |

---

## Lessons

- When a backend already returns structured data (numbers), derive UI state from those numbers — not from display strings. String-matching on user-facing text is fragile and locale-sensitive.
- A pulse skeleton placeholder is always better than `return null` on load — prevents layout shift and pop-in.
