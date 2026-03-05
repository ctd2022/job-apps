# Project Diary — Entry 061

**Date**: 2026-03-05
**Track**: 3.0 COMPLETE — CV Coach
**Branch**: `main`
**Theme**: Documentation overhaul + Ideas backlog review

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Committed diary 060 work, then did a full documentation overhaul (MASTER_VISION, ARCHITECTURE, API) and a thorough ideas backlog review — rejecting stale ideas, updating descriptions, and reframing scope on others.
- **Next steps**: Use the tool for real job applications. Return to backlog when genuine friction emerges. Top candidates when ready: #59 (job title bullet prompts, P5), #34 (STAR Coach, P4).
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Clean — 4 active ideas, all clearly scoped.

---

## What Was Done

### Committed Previous Session's Work

Committed the 5 Candidate Profile enhancements from diary 060 (commit `5ba10fd`):
- Education section, Professional Summary, SectionConfigPanel, ProfilePreview
- `summary` + `section_config` DB migrations
- Fixed pre-existing `ProfileUpdate` Pydantic bug (cert_grouping_mode/summary/section_config silently dropped)

### Documentation Overhaul (commit `8d35c33`)

All three core docs updated to reflect current state after 6 weeks of undocumented progress.

**`MASTER_VISION.md`**
- Header updated: Track 3.1 COMPLETE, branch `main`
- Added completed Track 2.9.2–3, Track 3.0 (CV Coach), and Track 3.1 (Candidate Profile) sections — everything since 26 Jan 2026 was missing
- Decision log extended through diary 060
- Phase 2 "Profile Management" marked as largely complete (it was listed as future)
- Strategic Priorities replaced with a current next-candidate table
- One-sentence summary and footer updated

**`docs/ARCHITECTURE.md`**
- `job_store.py` description includes `education` and `issuing_organisations`
- `cv_assembler.py` description includes summary, education, `EDU:id` markers
- `CandidateProfile.tsx` description covers all sections added since #233
- Key API Endpoints table has issuing org and education endpoints

**`docs/API.md`**
- Added issuing org endpoints (4, from #281)
- Added education endpoints (5, from diary 060)
- `assemble-cv` entry documents the full return shape including `sections` array
- `/profile` route description updated
- Database schema expanded from 4 tables to all 11: `users`, `jobs`, `cvs`, `cv_versions`, `match_history`, `candidate_profiles`, `job_history`, `issuing_organisations`, `certifications`, `skills`, `professional_development`, `education`

### Ideas Backlog Review

Reviewed all 7 remaining active ideas. Cleaned up stale, over-scoped, or low-value items.

| ID | Idea | Action | Reason |
|----|------|--------|--------|
| #1  | Llama.cpp model selection | Deferred | Server-restart UX constraint; Gemini handles capability tasks |
| #30 | Follow-up Automation | Rejected | Scheduling impractical for local tool; email draft has no unique value vs ChatGPT |
| #34 | STAR Behavioral Coach | Updated (notes + impact=High) | Valid — Job History makes this uniquely valuable here |
| #35 | Mock AI Interviewer | Rejected | No advantage over ChatGPT; audio/filler detection out of scope |
| #37 | Answer Reuse Engine | Updated (prereq #34, impact=High) | Build as same sprint as #34, not separately |
| #40 | Offer Comparator | Updated (priority lowered to P3) | Premature — build when offers are actually in play |
| #59 | Job title bullet suggestions | Updated (P4→P5, impact=High) | Best near-term candidate; uses position profiling + job history |
| #71 | Batch CV Processing | Reframed (complexity High→Low) | Drop full parallel generation; focus on lightweight multi-JD fit triage using existing ATS scorer |

**Resulting active backlog (4 ideas):**

| ID | Idea | Priority |
|----|------|----------|
| #59 | Job title-based bullet reflection prompts | P5 |
| #34 | STAR Behavioral Coach | P4 |
| #37 | Answer Reuse Engine (blocked on #34) | P4 |
| #71 | Multi-JD fit triage | P4 |

---

## Key Decisions

- **Use the tool first**: With Track 3.1 complete, the highest-value next action is running real job applications through the full loop (profile → assemble → tailor → submit → track) rather than adding more features. Return to the backlog once genuine friction emerges.
- **Reject over defer**: Ideas #30 and #35 were rejected outright rather than deferred — they don't have a unique advantage over general-purpose LLM tools and shouldn't clutter the backlog.
- **#71 reframed**: Batch processing as originally scoped (full parallel CV generation) is high complexity for a single user. Reframed as a lightweight pre-application triage tool using the existing ATS scorer with no LLM.
