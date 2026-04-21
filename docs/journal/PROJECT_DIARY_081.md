# Project Diary — Entry 081

**Date**: 2026-04-21
**Track**: Epic #38 — ATS Clarity (UAT)
**Ideas completed**: #663 (UAT: Epic #38 ATS Clarity chain)

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: feature/epic-38-ats-clarity
- **Track**: Epic #38 — ATS Clarity. UAT complete. Four follow-on ideas spawned.
- **Last session**: UAT of the full ATS Clarity epic (#57, #24, #660, #661, #662). All 9 tasks passed with findings captured as new ideas.
- **Next steps**: Work through #666, #667, #668, #669, then merge feature/epic-38-ats-clarity to main.
- **Blocked/broken**: Nothing
- **Ideas backlog**: #666 (Bug: Experience Level false negatives), #667 (Feature: Interview criteria prep responses), #668 (Bug: Full Analysis panel state), #669 (UX: Qualification Match labelling).

---

## Session — UAT: Epic #38 ATS Clarity (#663)

### What was tested

Full manual UAT of the ATS Clarity epic across all nine acceptance tasks.

**Passes**
- 10-category grid renders correctly with no hidden categories.
- Criterion cards expand to show matched/missing keywords with JD frequency badges.
- Matched/total counts (e.g. 2/5) are correct and visible on each card.
- Preferred qualifications section hidden gracefully when JD has no preferred language.
- Inferred interview criteria render with rationale and "inferred" label.
- Score Breakdown and Category Breakdown panels collapsed on first load.
- No JavaScript errors in console (two minor warnings noted below).

**Partial pass**
- Panel state (T#1529): most panels restore via sessionStorage but Full Analysis panel collapses on nav back — captured as #668.

### Console warnings (not errors)

- Form input missing `id`/`name` attribute — autofill/a11y warning, not breaking.
- React Router v7 future flag warnings (`v7_startTransition`, `v7_relativeSplatPath`) — routine deprecation notices.

### Findings spawned

| ID | Type | Title |
|----|------|-------|
| #666 | Bug | Experience Level scoring flags Missing when CV tenure implies sufficient experience |
| #667 | Feature | Interview criteria — add suggested prep response per criterion |
| #668 | Bug | Full Analysis panel state not restored by sessionStorage on nav back |
| #669 | UX | Qualification Match section — rename or recategorise competency items |

### Key observations

- **Experience Level false negatives**: the scorer matches explicit phrases ("6+ years") rather than inferring from CV role history and dates. A candidate with clear tenure gets a false Missing flag.
- **Interview criteria useful but incomplete**: the "Likely assessed in interview" section is genuinely valuable — candidates want it to go further and suggest how to respond to each point, not just what will be assessed.
- **Qualification Match labelling**: Leadership and Interpersonal appear as qualifications but are competencies. Section name or item classification needs rethinking.
- **UAT duration**: 1.5h actual vs 0.5h estimated — UAT rounds consistently run longer than point estimates suggest; calibrate future UAT estimates upward.
