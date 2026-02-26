# Project Diary 050 — Ideas Triage + Privacy Footer Fix (Idea #235)

**Date**: 2026-02-26
**Branch**: main

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Full backlog triage (50 ideas reviewed). Closed 5 redundant/duplicate ideas, deferred 18 (Track 3 / out of scope). Fixed misleading privacy footer (#235): footer now shows accurate message per active LLM backend.
- **Next steps**: CV Coach writing quality batch — implement #51, #52, #53, #43 as a single session (all fit into `_generate_coach_suggestions()` in `backend/main.py`, no LLM needed). Then #100 (Auto-Suggest Keywords, P5).
- **Blocked/broken**: Nothing.
- **Ideas backlog**: Active backlog is now clean — 50 open ideas are all actionable. Priority order: #51 Essential sections · #52 Active voice · #53 Buzzwords · #43 Repetition → #100 Auto-Suggest Keywords (P5) → #78 Enhanced Gap Analysis → #55 Summary Generator.

---

## Changes This Session

### Backlog triage

Reviewed all 50 open ideas against current architecture and "moves the needle" criterion.

**Closed as Done (superseded):**
- #3 Profile management → superseded by #233 (Candidate Profile — Done)
- #236 Pull from Profile: inject contact header → superseded by #238 (Done)

**Rejected (redundant/duplicate):**
- #15 Multi-user with isolated profiles — sits in the gap between #21 (done) and #4 (Track 3); adds nothing
- #11 Batch processing — duplicate of #71
- #84 ML-Powered Intelligence Platform — vague epic requiring a user base; actionable ML work already done via #76

**Deferred to Track 3 / SaaS:**
- #4 User auth · #5 Payments · #6 PostgreSQL · #7 S3 · #83 AWS Bedrock · #105 Deploy online

**Deferred (out of scope / external deps):**
- #13 LinkedIn import · #14 Job board integrations · #17 Ensemble · #25 Cultural tone · #26 LinkedIn Optimizer · #27 Portfolio · #31 Recruiter outreach · #38 Salary data · #39 Negotiation scripts · #41 Career pathing · #106 Multi-workstation DevEx · #109 AI Career Agent

---

### Idea #235 — Fix misleading privacy footer

**Problem**: Footer showed `🛡 100% Local · Your CV never leaves this PC` regardless of backend. When Gemini is selected, CV text (PII-scrubbed) is sent to Google's cloud — the claim was false.

**Fix**: `frontend/src/App.tsx` footer now reads `localStorage.getItem('llm_backend')` on each render and branches:

- **Local backends** (ollama, llama.cpp): green shield — `100% Local · Your data never leaves this PC`
- **Gemini**: amber shield — `Local storage · PII scrubbed before Gemini cloud call`

Derives backend from localStorage on every render; App already re-renders on route navigation via `useLocation`, so the message is always current without extra subscriptions.

**Commit**: `1029467`

---

## Next Session Plan

### CV Coach writing quality batch (#51, #52, #53, #43)

All four fit the exact same pattern as Idea #45 (Quantified Impact Checker):
- Add a new check function in `backend/main.py`
- Append suggestion(s) to `_generate_coach_suggestions()`
- Extend `CoachingSuggestion.category` union in `frontend/src/types.ts` if needed

No LLM required — all regex/list based.

| Idea | Check | Implementation |
|------|-------|----------------|
| #51 | Essential sections | `document_parser.py` already detects sections — just check for presence of Summary/Experience/Education/Skills |
| #52 | Active voice | Regex for passive patterns: `\bwas\s+\w+ed\b`, `\bwere\s+\w+ed\b`, "responsible for", "involved in" |
| #53 | Buzzword/cliché | Curated list: "team player", "synergy", "think outside the box", "results-driven", "self-starter", etc. |
| #43 | Word repetition | Count word frequencies across CV, flag words appearing 5+ times (excluding stop words) |

After this batch: **#100 Auto-Suggest Keywords** (P5, high complexity) — surfaces where existing experience maps to JD requirements but is buried or undersells.
