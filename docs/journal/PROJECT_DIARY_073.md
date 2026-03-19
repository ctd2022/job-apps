# Project Diary — Entry 073

**Date**: 2026-03-19
**Track**: 4.0 Planning — Application Intelligence
**Ideas completed**: #490, #491–#500 (epic created), #501, #502

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: main
- **Track**: 4.0 — Application Intelligence (planning complete, epic #21 created, ready to implement)
- **Last session**: Full planning session. Competitive research. Created Epic #21 (10 ideas, ~33h). Created #501 (branching rules, programme-level). Created #502 (Quality & Control self-improvement dashboard, programme-level). Completed #490 (backlog review process). Deferred #91, #231, #72.
- **Blocked/broken**: Nothing
- **Ideas backlog**: Epic #21 ready to execute. See programme diary 2026-03-19 for full next-session prompt and recommended order of attack.
- **Next steps**: See programme diary 2026-03-19 — start with #501 (branching rules) then #493 (stage history foundation).

---

## Session — Backlog review process (#490)

### Context

User identified a significant new direction: **Application Intelligence and Success Tracking** (Track 4.0). Before creating the ~10 new ideas, we ran a backlog review to prevent drift — old ideas written with stale context sitting alongside new ones that duplicate or contradict them.

### Competitive research

Ran structured competitive analysis across: LinkedIn, Indeed, Teal, Huntr, Careerflow, Simplify, Jobscan, Hired, Otta, Wellfound, Glassdoor, Workday/Greenhouse/Lever.

**Key finding**: No competitor adequately solves the *after-apply* experience. They focus on before-apply (match explanations, recommendations) and during-apply (form friction). The post-apply loop — outcome tracking, rejection analysis, cross-application learning — is unoccupied.

### Track 4.0 plan (confirmed by user)

Three-phase epic:

**Phase 1 — Lifecycle Foundation (~12h)**
- Saved/Wishlist: quick-add a job before applying
- Kanban board with drag-drop (tab-toggle alongside existing table view — user chose B)
- Stage transition timestamps + audit log

**Phase 2 — Outcome Tracking (~7h)**
- Structured rejection capture: dropdown + LLM analysis
- Recruiter contact fields + ghosting detection (no response >21 days)
- Follow-up reminder surfacing on dashboard

**Phase 3 — Analytics & Adaptation (~14h)**
- Success funnel dashboard (response/interview/offer rates)
- Time-series response rate trends
- History-informed tips during CV generation
- Cross-application skill frequency surface

### Ideas deferred (absorbed into Track 4.0)

| ID | Title | Reason |
|----|-------|--------|
| #91 | Kanban Application Tracker | Phase 1 supersedes with richer spec + tab-toggle |
| #231 | Job Profiling: Application History Tracking | Phase 1 timestamps + Phase 3 analytics supersede |
| #72 | Historical Application Analytics | Phase 3 success funnel + time-series supersede |

Each marked Deferred with a note referencing Track 4.0.

### CLAUDE.md updated

Added mandatory **Backlog Review** section to Feature Development Workflow: before adding 3+ ideas in one session, list related open ideas and decide Keep/Merge/Supersede/Reject. This prevents the pattern of planning sessions adding redundant ideas without resolving stale ones.

### #490 tasks

| Task | Status |
|------|--------|
| Update CLAUDE.md with backlog review step | Done |
| Add --stale-days CLI filter | Descoped (future enhancement to ideas.py) |
| Mark #91, #231, #72 as Deferred | Done |
| Write diary entry | Done |
