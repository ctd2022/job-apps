# TODO.md - Agent Handover

**Status**: PENDING
**From**: Claude (Lead Architect)
**To**: Gemini (Secondary Agent)
**Date**: 30 January 2026

---

## Task 1: Write Project Diary Entry 020

### What to do

Create `docs/journal/PROJECT_DIARY_020.md` documenting this session (30 January 2026).

### File to create

`docs/journal/PROJECT_DIARY_020.md`

### Format

Follow the exact structure used in `docs/journal/PROJECT_DIARY_019.md`. No emojis (Windows cp1252).

### Content to cover

This was a substantial session covering Track 2.9.2 integration, debugging, process improvements, and feature ideation.

#### 1. Track 2.9.2 Complete - ATS Analysis Components Integrated

- Three orphaned React components wired into `JobDetail.tsx`:
  - `MatchExplanationCard` - score breakdown (lexical/semantic/evidence stacked bar, keyword matches, semantic section matches, improvement suggestions)
  - `MissingKeywordsAlert` - priority-tiered missing keywords (critical/required/hard skills/preferred)
  - `CVCompletenessMeter` - weighted section completeness checklist with entity counts
- Single file change: `frontend/src/components/JobDetail.tsx`
  - Added imports, state (`atsAnalysis`, `loadingAnalysis`), fetch logic in `loadJob()`, and rendering between ATS score bar and error section
  - Graceful degradation: legacy jobs without `ats_details` show nothing (no errors)
  - Loading spinner while fetching analysis data
- TypeScript check passed (no new errors)
- Ideas #89, #96, #97 marked as Done
- Diary entry 019 created by Gemini (first successful handover for this track)

#### 2. Backend Debugging - Zombie Process Mystery

- User tried to create a job but got "Workflow modules not available" error
- Initially appeared to be missing `PyPDF2` dependency - delegated investigation to Gemini
- Gemini got stuck (was observing Claude's process restarts and may have interfered)
- Claude took over investigation and discovered the real issue:
  - `python-multipart` install earlier had crashed the server, leaving **zombie Python processes** holding port 8000
  - Every restart attempt failed silently (port conflict), so the old broken process kept serving
  - `PyPDF2` was actually installed and imports worked fine from CLI
  - Fix: kill all stale Python processes (`taskkill /F /PID`), then restart on clean port
  - `workflow_available: true` confirmed after clean restart
- Key debugging technique: `netstat -ano | findstr :8000 | findstr LISTENING` to find zombie PIDs

#### 3. Multi-Agent Process Improvements

Two major lessons captured and documented in both CLAUDE.md and GEMINI.md:

**A. Debugging Protocol** (added to Troubleshooting section):
- 5-step protocol: check port ownership -> kill stale processes -> restart on clean port -> check health -> only then investigate code
- New troubleshooting table entries for `workflow_available: false`, stale restarts, "was working before" scenarios
- Delegation lessons: diagnostic-first approach, include known clues, set boundaries

**B. Agent Concurrency Rule** (added to Handover Protocol section):
- Claude and Gemini cannot see each other and have no coordination mechanism
- Strictly turn-based: user must fully exit one agent before starting the other
- Gemini told not to touch services unless task specifically requires it
- Handover steps updated to include "finish active work and stop background tasks"

#### 4. CV Improvement Loop - Feature Ideation

User proposed a substantial feature pipeline (ideas #98-#102):
- **#98 CV Versioning System** (Architecture, High complexity) - version tracking for CVs, 1-to-many job-to-CV-version relationship
- **#99 In-App CV Text Editor** (Feature, Medium) - modal to edit raw CV text after seeing analysis
- **#100 Auto-Suggest Keywords** (Feature, High) - inject missing keywords from ATS analysis into editor
- **#101 Re-Match Workflow** (Feature, Medium) - re-run ATS scoring with improved CV against same job
- **#102 Score Comparison View** (UI, Medium) - before/after visual comparison of scores

Sequencing: #98 (foundation) -> #99 -> #101 -> #100 -> #102

### Files Changed

| File | Changes |
|------|---------|
| `frontend/src/components/JobDetail.tsx` | Integrated 3 ATS analysis components with state, fetch, and rendering |
| `CLAUDE.md` | Added debugging protocol, troubleshooting entries, agent concurrency rule, updated handover protocol |
| `GEMINI.md` | Added debugging protocol, troubleshooting entries, agent concurrency rule |
| `backend/main.py` | Temporary debug changes during investigation (reverted to original print statements) |
| `ideas.db` | Ideas #89, #96, #97 marked Done; ideas #98-#102 added (CV improvement loop) |
| `docs/journal/PROJECT_DIARY_019.md` | Created by Gemini (Track 2.9.2 integration) |

### What's Next

- Commit all changes and push
- Manual testing of ATS analysis display with newly generated jobs
- Begin planning Track for CV Versioning (#98) - the foundation for the improvement loop
- Consider delegating data model review to Gemini (large-context analysis of current schema vs proposed changes)

### Acceptance criteria

- [ ] File created at `docs/journal/PROJECT_DIARY_020.md`
- [ ] Follows format of diary entries 018/019
- [ ] Covers all 4 content sections above
- [ ] Includes Files Changed table
- [ ] Factual and concise tone, no emojis

### When done

Update this file:
1. Change **Status** at the top to `COMPLETE`
2. Check all acceptance criteria boxes
3. Add a `## Completion Summary` section

---

## Task 2: Commit and Push

After creating the diary entry, stage and commit all changes, then push.

### Files to commit

**Modified:**
- `CLAUDE.md`
- `GEMINI.md`
- `TODO.md`
- `backend/main.py`
- `backend/job_store.py`
- `frontend/src/api.ts`
- `frontend/src/components/JobDetail.tsx`
- `frontend/src/types.ts`
- `ideas.db`

**New (untracked - add these):**
- `docs/journal/PROJECT_DIARY_019.md`
- `docs/journal/PROJECT_DIARY_020.md`
- `frontend/src/components/CVCompletenessMeter.tsx`
- `frontend/src/components/CollapsibleSection.tsx`
- `frontend/src/components/MatchExplanationCard.tsx`
- `frontend/src/components/MissingKeywordsAlert.tsx`

**DO NOT commit these:**
- `.claude/settings.local.json`
- `docs/raw/competitors-ux/` (research files, not ready)
- `docs/summary_gpt29012026.md`
- `frontend/src/reverse_string.py` (test file)
- `job_applications.code-workspace`

### Commit message

```
Track 2.9.2: Integrate ATS analysis components into job detail view

- Wire MatchExplanationCard, MissingKeywordsAlert, CVCompletenessMeter into JobDetail.tsx
- Add ATS analysis fetch logic with graceful degradation for legacy jobs
- Add debugging protocol and agent concurrency rules to CLAUDE.md and GEMINI.md
- Add CV improvement loop ideas (#98-#102) to backlog
- Add diary entries 019 and 020
```

### After commit

```bash
git push origin track2.8-semantic-ats
```

### Acceptance criteria

- [ ] Only the listed files are committed (nothing from the DO NOT commit list)
- [ ] Commit message matches the one above
- [ ] Push to `origin/track2.8-semantic-ats` succeeds

---

**End of handover instructions**
