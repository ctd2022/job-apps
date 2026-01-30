# CLAUDE.md - Job Application Workflow

AI-powered tool that generates tailored CVs, cover letters, and ATS analysis.

**Current Status**: Track 2.9.1 COMPLETE - Quick Wins | **Branch**: `track2.8-semantic-ats`

---

## IMPORTANT: Start Services Before Testing

**YOU MUST check services are running before any frontend testing:**

```bash
# Check status
curl -s http://localhost:8000/api/health  # Backend (expect JSON)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173  # Frontend (expect 200)

# If not running, start in background:
cd "C:/Users/davidgp2022/My Drive/Kaizen/job_applications" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
cd "C:/Users/davidgp2022/My Drive/Kaizen/job_applications/frontend" && npm run dev
```

---

## Commands

| Command | Description |
|---------|-------------|
| `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload` | Start backend |
| `cd frontend && npm run dev` | Start frontend |
| `cd frontend && npx tsc --noEmit` | TypeScript check |
| `python scripts/ideas.py list` | View ideas backlog |
| `python scripts/ideas.py add` | Add new idea |
| `python scripts/ideas_html.py && start ideas.html` | View ideas in browser |
| `curl http://localhost:8000/api/health` | Health check |

---

## IMPORTANT: Feature Development Workflow

**YOU MUST funnel ALL new features through `ideas.db` before implementing:**

1. **Capture** → Add idea to database (see below)
2. **Start Work** → Update status to "In Progress"
3. **Plan** → Enter plan mode, explore codebase, design approach
4. **Implement** → Follow the plan
5. **Complete** → Update status to "Done", update docs, create diary entry

### Updating Idea Status

**ALWAYS update ideas.db when starting or completing work:**

```python
# Mark idea(s) as In Progress when starting
python -c "
import sqlite3
from datetime import datetime
conn = sqlite3.connect('ideas.db')
cursor = conn.cursor()
cursor.execute('UPDATE ideas SET status = ?, updated_at = ? WHERE id IN (ID1, ID2)', ('In Progress', datetime.now().isoformat()))
conn.commit()
print(f'Updated {cursor.rowcount} ideas')
conn.close()
"

# Mark idea(s) as Done when complete
python -c "
import sqlite3
from datetime import datetime
conn = sqlite3.connect('ideas.db')
cursor = conn.cursor()
cursor.execute('UPDATE ideas SET status = ?, updated_at = ? WHERE id IN (ID1, ID2)', ('Done', datetime.now().isoformat()))
conn.commit()
print(f'Updated {cursor.rowcount} ideas')
conn.close()
"
```

**Status values**: Idea → In Progress → Done (or Rejected/Deferred)

### Capturing User Suggestions

**When the user suggests a feature or improvement, ALWAYS add it to `ideas.db`:**

```python
python -c "
import sqlite3
from datetime import datetime
conn = sqlite3.connect('ideas.db')
cursor = conn.cursor()
cursor.execute('''
    INSERT INTO ideas (title, description, category, complexity, impact, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', ('Title here', 'Description here', 'Feature', 'Medium', 'High', 5, 'Idea', datetime.now().isoformat()))
conn.commit()
print(f'Added idea #{cursor.lastrowid}')
conn.close()
"
```

- Category: Feature, UI, Bug, Architecture, Research
- Complexity: Low, Medium, High
- Impact: Low, Medium, High
- Priority: 1-5 (5 = highest)

---

## Code Style

### Python
- Use type hints
- Follow patterns in `src/job_application_workflow.py`
- Use `JobStore` for persistence

### TypeScript/React
- Functional components with hooks
- TailwindCSS for styling
- All API calls through `frontend/src/api.ts`
- Normalize responses in api.ts

### General
- Keep changes minimal and focused
- Test before committing
- Update `ideas.db` status when starting/completing features
- Update diary for significant changes

---

## Common Tasks

### Add API endpoint
1. Edit `backend/main.py`
2. Update `frontend/src/api.ts`
3. Update `frontend/src/types.ts` if needed

### Modify frontend
1. Edit component in `frontend/src/components/`
2. Test at http://localhost:5173

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend not connecting | Check backend on port 8000, check `vite.config.ts` proxy |
| API 422 errors | Check FormData field names match backend |
| Ollama not responding | Run `ollama list`, then `ollama serve` |
| Unicode/emoji errors | Use text labels `[OK]` not emojis (Windows cp1252) |
| Job stuck at % | LLM generating - check llama-server console |

---

## Files to NOT Commit

`jobs.db`, `ideas.db`, `ideas.html`, `.env`, `.claude/settings.local.json`, `CLAUDE.local.md`

---

## Reference Docs

- `MASTER_VISION.md` - Strategic direction and roadmap
- `docs/ARCHITECTURE.md` - Directory structure, system overview
- `docs/API.md` - Endpoints, routes, database schema
- `docs/journal/PROJECT_DIARY_*.md` - Progress history
- `GEMINI.md` - Gemini CLI agent context (secondary agent instructions)
- `TODO.md` - Agent handover instructions (Claude <-> Gemini)

---

## Agent Delegation: Gemini CLI

**You (Claude) are the Lead Architect.** Gemini is a secondary agent that follows your patterns.

### When to delegate to Gemini:
- **Bulk file changes**: Task touches 5+ files with repetitive patterns
- **Boilerplate/scaffolding**: Unit tests, type stubs, repetitive component creation
- **Repo-wide refactors**: Renaming variables, updating imports across many files
- **Large context analysis**: Cross-cutting concerns that benefit from Gemini's 1M token window
- **Documentation generation**: API docs, test plans, type documentation

### Keep in Claude (do NOT delegate):
- **Architectural decisions**: New patterns, schema changes, scoring formula changes
- **Core business logic**: ATS scoring, workflow pipeline, LLM integration
- **Feature design**: Planning new features from scratch (Claude plans, Gemini implements)
- **Bug diagnosis**: Debugging complex issues that require understanding intent

### Handover protocol:
1. **Claude writes instructions** into `TODO.md` with specific file paths, patterns to follow, and acceptance criteria
2. **User switches to Gemini CLI** - Gemini reads `GEMINI.md` (its context file) and `TODO.md`
3. **Gemini implements** and writes a summary of changes back into `TODO.md`
4. **User switches back to Claude** - Claude reviews the changes via `TODO.md` and git diff

### Key files:
- `GEMINI.md` - Gemini's project context (mirrors CLAUDE.md but scoped for secondary role)
- `TODO.md` - Handover instructions and completion summaries between agents

**Last Updated**: 30 January 2026
