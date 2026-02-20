# Project Diary 034 - Multi-Agent Session: Ideas Cleanup & Formatting Tips

**Date**: 05 February 2026
**Focus**: Backlog cleanup, UX research, and ATS formatting tips implementation
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: track2.8-semantic-ats
- **Track**: 2.9.5 - LLM-Assisted CV Improvement
- **Last session**: Completed #56, #88, #123. Verified #81/#121 already done. Added #124/#125 to backlog.
- **Next steps**: #124 (Live Score Preview) or #125 (Onboarding Tooltips)
- **Blocked/broken**: Nothing
- **Ideas backlog**: #124, #125 are next priority from UX research

---

## Session Summary

Multi-agent session with Claude (lead), Gemini (implementation), and ChatGPT (research).

### 1. Finished Idea #56 - AI Skill Suggester

Gemini had partially implemented the backend, but frontend integration failed. Claude completed:
- Added `suggestSkills` import to JobDetail.tsx
- Added state management for suggestions/loading/errors
- Wired up button onClick handler
- Added display of suggested skills with dismiss functionality
- Fixed pre-existing TS error in api.ts (`getBackends` missing type param)

### 2. Backlog Cleanup

Verified two high-priority ideas were already implemented:
- **#81 Multiple CVs per user** → Done (CVManager.tsx, full CRUD)
- **#121 ATS Score History** → Done (MatchHistoryTable, match_history table)

Both marked as Done in ideas.db.

### 3. UX Research #88 - Delegated to ChatGPT

Gemini's tools were unavailable, so research was delegated to ChatGPT with a prompt. Output saved to `docs/research/job_platforms_ux_analysis.md` (191 lines).

Key recommendations from research:
1. Match Score Dashboard ✓ (already done)
2. Skill Gap Visualization ✓ (already done)
3. ATS Formatting Tips → #123
4. Actionable Improvement Tips ✓ (already done)
5. Live Score Preview → #124 (new)
6. Onboarding/Tooltips → #125 (new)

### 4. Added New Ideas from UX Research

| ID | Title | Est | Priority |
|----|-------|-----|----------|
| #123 | ATS Formatting Tips (Inline Guidance) | 5 pts | P4 |
| #124 | Live Score Preview During CV Edit | 8 pts | P4 |
| #125 | Onboarding Flow & Guided Tooltips | 5 pts | P3 |

### 5. Implemented #123 - ATS Formatting Tips (Gemini + Claude)

**Gemini** created `FormattingTipsPanel.tsx` with 8 detection rules:
- no-tables, no-columns, standard-headings, has-contact
- has-dates, bullet-points, cv-length-short, cv-length-long

Integrated into CVTextEditor below the textarea.

**Claude fixes**:
- Fixed escaped newlines (`'\\n'` → `'\n'`) in regex patterns
- Fixed `List[str]` → `list[str]` in ats_optimizer.py (Python 3.9+ syntax)

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/JobDetail.tsx` | Added skill suggester integration (#56) |
| `frontend/src/api.ts` | Fixed getBackends type param |
| `frontend/src/components/FormattingTipsPanel.tsx` | NEW - formatting tips panel (#123) |
| `frontend/src/components/CVTextEditor.tsx` | Added FormattingTipsPanel |
| `src/ats_optimizer.py` | Fixed `list[str]` return type |
| `docs/research/job_platforms_ux_analysis.md` | NEW - UX research output |
| `ideas.db` | Updated #56, #81, #88, #121, #123 to Done; added #124, #125 |

---

## Ideas Status

| ID | Title | Status |
|----|-------|--------|
| #56 | AI Skill Suggester | Done |
| #81 | Multiple CVs per user | Done (verified) |
| #88 | UX Research: Job Platforms | Done |
| #121 | ATS Score History | Done (verified) |
| #123 | ATS Formatting Tips | Done |
| #124 | Live Score Preview | Idea (new) |
| #125 | Onboarding Tooltips | Idea (new) |

---

## Lessons Learned

1. **Gemini tool issues**: When Gemini's tools fail, delegate research tasks to ChatGPT
2. **Regex in JS strings**: Use `'\n'` not `'\\n'` - the latter creates a literal backslash-n
3. **Python typing**: Use `list[str]` (lowercase) for Python 3.9+, not `List[str]`
4. **Backlog hygiene**: Regularly verify if "Idea" status items are already implemented
