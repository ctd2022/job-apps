# TODO.md - Agent Handover

**Status**: PENDING — Gemini to write diary entry and push to git
**From**: Claude (Lead Architect)
**Date**: 2 February 2026

---

## Task: Write Diary Entry 025 + Git Commit & Push

### 1. Create `docs/journal/PROJECT_DIARY_025.md`

Follow the format of entry 024. Title: **"LLM-Assisted CV Improvement"**. Include the Quick Resume section at the top.

#### Content to cover

**Idea #122 — LLM-Assisted CV Improvement (COMPLETE)**

Full feature implemented across the stack:

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | Added `incorporate_keywords()` method — LLM prompt with structured `===CHANGELOG===` separator, conservative temp 0.3, no-fabrication rules |
| `backend/main.py` | Added `ApplySuggestionsRequest` model + `POST /api/jobs/{job_id}/apply-suggestions` endpoint. Parses changelog from LLM output, strips preamble, returns `backend_type`/`model_name`/`changelog` |
| `frontend/src/types.ts` | Added `ApplySuggestionsResponse` interface |
| `frontend/src/api.ts` | Added `applySuggestions()` function |
| `frontend/src/components/SuggestionChecklist.tsx` | **New file** — interactive checklist with keyword + weak skill selection, select all/none, "Apply Selected" button |
| `frontend/src/components/CVTextEditor.tsx` | Integrated SuggestionChecklist, applying state, changelog populates change summary field |
| `frontend/src/components/MissingKeywordsAlert.tsx` | Added `defaultCollapsed` prop |

**The Ghost Socket Incident**

This is worth documenting as a lesson. After implementing #122, the endpoint returned 404. Gemini was delegated to debug. Gemini correctly verified:
- Code was present in `backend/main.py`
- `WORKFLOW_AVAILABLE` was `True`
- No duplicate `main.py` files
- Endpoint definition was syntactically correct

Gemini concluded it couldn't proceed further without being able to run curl directly. Its diagnosis was sound — the problem was environmental, not code-level.

**Root cause** (found by Claude): A dead Python process (PID 12484) left a ghost TCP socket on port 8000. The process didn't appear in `tasklist` or `Get-Process`, but `netstat` still showed it as LISTENING. New uvicorn instances on port 8000 could bind (SO_REUSEADDR), but incoming requests were being routed to the dead socket. Proven by starting on port 8001 where the endpoint worked immediately.

**Fix**: Temporarily switched to port 8001 and updated `vite.config.ts` proxy target. This should be reverted back to port 8000 after a reboot or once the ghost socket clears.

**Lesson for future debugging**: When endpoints exist in code but return 404 on a seemingly fresh server, check whether multiple processes are bound to the same port (`netstat -ano | findstr :<PORT> | findstr LISTENING`). On Windows, dead processes can hold sockets for extended periods.

**New ideas added**:
- #123 — LLM backend picker for Apply Suggestions (let user choose model, currently hardcoded from job)
- #124 — Fix blank Backend/Created labels on application overview page

#### Quick Resume section values

- **Branch**: `track2.8-semantic-ats`
- **Track**: 2.9.5 — LLM-Assisted CV Improvement complete
- **Last session**: Completed #122. Full-stack feature: select missing ATS keywords, LLM incorporates them into CV, returns changelog. Debugged ghost socket issue blocking endpoint. Temporarily on port 8001.
- **Next steps**: #124 (quick bug fix — blank labels), #123 (LLM picker for suggestions), then #104 (per-component testing strategy) or #79 (ATS explainability UI)
- **Blocked/broken**: Port 8000 has ghost socket — using 8001 temporarily. `vite.config.ts` proxy points to 8001, revert after reboot.
- **Ideas backlog**: #122 done. New: #123, #124. Pipeline: #124 (quick win), #123, #79, #104

### 2. Update idea #122 status to Done

```python
python -c "
import sqlite3
from datetime import datetime
conn = sqlite3.connect('ideas.db')
cursor = conn.cursor()
cursor.execute('UPDATE ideas SET status = ?, updated_at = ? WHERE id = 122', ('Done', datetime.now().isoformat()))
conn.commit()
print(f'Updated {cursor.rowcount} ideas')
conn.close()
"
```

### 3. Git commit and push

Stage and commit all working tree changes. Use conventional commit format:

```
feat: Add LLM-assisted CV improvement from ATS checklist (#122)

- incorporate_keywords() in ATSOptimizer with structured changelog output
- POST /api/jobs/{job_id}/apply-suggestions endpoint with preamble stripping
- SuggestionChecklist component with keyword/weak-skill selection
- CVTextEditor integration: apply suggestions, show changelog in change summary
- Temporarily on port 8001 (vite proxy updated) due to ghost socket on 8000
```

Then: `git push`

### What NOT to change

- Do NOT modify any source code
- Do NOT refactor or "improve" anything
- Only create the diary entry, update ideas.db, and commit/push

### Files to commit

All modified tracked files plus new files:
- `src/ats_optimizer.py`
- `backend/main.py`
- `frontend/src/api.ts`
- `frontend/src/types.ts`
- `frontend/src/components/CVTextEditor.tsx`
- `frontend/src/components/MissingKeywordsAlert.tsx`
- `frontend/src/components/SuggestionChecklist.tsx`
- `frontend/vite.config.ts`
- `docs/journal/PROJECT_DIARY_025.md` (new)
- `TODO.md`

Do NOT commit: `jobs.db`, `ideas.db`, `ideas.html`, `.env`

---

**End of handover instructions**
