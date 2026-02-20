# Project Diary 042 - JD Intelligence Track (Planning)

**Date**: 20 February 2026
**Focus**: Planning session — Ideas #32, #58, #23 (JD Intelligence grouping)
**Status**: PLANNED — not yet started

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `track-jd-intelligence`
- **Track**: JD Intelligence — three features that extract more signal from the job description
- **Last session**: Merged track2.8-semantic-ats into main; cleaned up .gitignore; marked #33 done. Created this branch ready to go.
- **Next steps**: Implement #32, #58, #23 — see feature breakdown below
- **Blocked/broken**: Nothing
- **Ideas backlog**: #32, #58, #23 all marked In Progress

---

## What to Build

Three features, all focused on getting more intelligence out of the job description itself. Suggested implementation order: #58 → #32 → #23 (simplest to most complex).

---

### Idea #58 — Keyword Priority Ranking

**What**: Rank ATS keywords by importance (High / Medium / Low) rather than treating all missing keywords equally.

**How**: Score each keyword by signals already available:
- Appears in job title → High
- Appears in first 200 words of JD → High
- Appears multiple times → bump up one level
- Section context: "Required" / "Essential" → High; "Preferred" / "Desirable" → Medium; other → Low

**Where**: `src/ats_optimizer.py` — add `priority` field to keyword objects. Surface in the existing missing keywords UI with a colour-coded badge (red = High, amber = Medium, grey = Low).

**Effort**: Low-Medium — logic is additive, no new data sources.

---

### Idea #32 — JD Red-Flag Detector

**What**: Analyse the job description and surface warning signs before the user applies.

**Flags to detect** (start with these, can expand):

| Flag | Signal | Severity |
|------|--------|----------|
| Salary withheld | No salary/range mentioned | Warning |
| Unpaid trial | "trial period", "test task" without "paid" | Warning |
| Vague role | No concrete responsibilities | Info |
| Stack overload | >8 distinct technologies required | Info |
| Experience mismatch | "10+ years" + "entry level" or "junior" | Warning |
| Excessive hours | "fast-paced", "always on", "wear many hats" × 2+ | Warning |

**Where**: New `src/jd_analyser.py` module. New backend endpoint `GET /api/jobs/{id}/jd-flags`. New small component `JDRedFlags.tsx` shown in the job detail view (above or near the ATS panel).

**Effort**: Medium — new module + endpoint + component, but all client-side regex/heuristic logic, no LLM call needed.

---

### Idea #23 — ATS Confidence Score

**What**: A single 0–100 confidence number that summarises how reliable the ATS score is, shown alongside the ATS percentage.

**Why**: The ATS % can be misleading when based on a short JD or very sparse CV. A confidence score tells the user how much to trust it.

**Signals to factor in**:
- JD word count (short JD = lower confidence)
- Number of keywords extracted (few = lower)
- CV length (very short = lower)
- Semantic scorer coverage (low entity overlap = lower)

**Where**: `src/ats_optimizer.py` — add `confidence` field to the ATS result. Surface as a small badge next to the ATS score in `JobDetail.tsx` / `ATSExplainability.tsx`.

**Effort**: Medium — formula design is the main work; wiring it through is straightforward.

---

## Suggested File Touchpoints

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | Keyword priority logic (#58); confidence score (#23) |
| `src/jd_analyser.py` | New — red-flag detection (#32) |
| `backend/main.py` | New endpoint for JD flags (#32) |
| `frontend/src/types.ts` | New types for flags, priority, confidence |
| `frontend/src/api.ts` | New `getJDFlags()` call |
| `frontend/src/components/JDRedFlags.tsx` | New — flag display (#32) |
| `frontend/src/components/MissingKeywordsAlert.tsx` | Priority badges (#58) |
| `frontend/src/components/JobDetail.tsx` | Wire in flags + confidence badge |

---

## Start Here Next Session

1. Read this Quick Resume
2. Check backend is running: `curl http://localhost:8000/api/health`
3. Start with #58 (keyword priority) — smallest change, sets up thinking for the others
4. Work order: #58 → #32 → #23
