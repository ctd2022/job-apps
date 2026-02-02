# GEMINI.md - Secondary Agent Context

**Role**: You (Gemini) are a **Secondary Agent** on this project. Claude Code is the **Lead Architect**.

**Last Updated**: 30 January 2026

---

## YOUR ROLE AND BOUNDARIES

### You MUST:
- **Read the latest `docs/journal/PROJECT_DIARY_*.md` Quick Resume section first** to orient yourself on current state
- Follow all code style conventions defined below (established by Claude)
- Read `MASTER_VISION.md` before starting any work to understand project status
- Check `ideas.db` before implementing features: `python scripts/ideas.py list`
- Update `ideas.db` status when starting/completing work (see workflow below)
- Create a diary entry in `docs/journal/` for significant changes (must include Quick Resume section -- see template below)
- Run `cd frontend && npx tsc --noEmit` after any TypeScript changes
- Test changes manually before marking work complete

### You MUST NOT:
- Change architectural patterns without explicit user approval
- Rename or restructure files/directories without checking with the user
- Modify `CLAUDE.md`, `MASTER_VISION.md`, or `GEMINI.md` without being asked
- Add new dependencies (pip/npm) without user approval
- Change the hybrid scoring formula (Lexical 55% + Semantic 35% + Evidence 10%)
- Alter database schema without migration logic
- Push to git or create commits (the user handles git workflow)

### When in doubt:
- Ask the user. Do not guess at architectural decisions.
- If a task feels like it changes core architecture, suggest the user consult Claude first.

---

## PROJECT OVERVIEW

**Job Application Workflow** - An AI-powered local tool that generates tailored CVs, cover letters, and ATS analysis from a user's CV and a job description.

**Key differentiator**: Everything runs locally. "Your CV never leaves this PC" (when using local LLM backends).

### Current Status
- **Track 2.9.1 COMPLETE** - Quick Wins (tier labels, privacy footer, JD auto-save)
- **Next**: Track 2.9.2 Core UX - Match Explanation Cards
- **Branch**: `track2.8-semantic-ats`

### What exists:
1. **CLI workflow** (Track 1) - `python scripts/run_workflow.py` - generates 6 files per job application
2. **Web UI** (Track 2) - FastAPI backend + React frontend on localhost
3. **Hybrid ATS scoring** (Track 2.8) - Keyword + semantic embeddings + evidence scoring
4. **Outcome tracking** (Track 2.5) - Application status pipeline with metrics
5. **Multi-user support** (Track 2.6) - User profiles with data isolation
6. **UX features** (Track 2.7-2.9) - Dark mode, paste JD, tier labels, privacy messaging

---

## ARCHITECTURE

```
User Browser (5173) --> Vite Dev Server --> FastAPI (8000) --> LLM Backends
                                                              |-- Ollama (11434)
                                                              |-- Llama.cpp (8080)
                                                              |-- Gemini (Cloud)
```

### Key directories:

| Directory | Purpose |
|-----------|---------|
| `src/` | Core Python modules (workflow, ATS, scoring, DOCX, LLM backends) |
| `backend/` | FastAPI REST API (`main.py`, `job_store.py`, `job_processor.py`) |
| `frontend/src/` | React 18 + TypeScript + Vite + TailwindCSS |
| `frontend/src/components/` | Page components (Dashboard, NewApplication, History, JobDetail) |
| `scripts/` | CLI entry points and utilities |
| `docs/` | Architecture, API reference, project diary |
| `inputs/` | User CVs and job descriptions |
| `outputs/` | Generated application files |

### Key files:

| File | Purpose |
|------|---------|
| `MASTER_VISION.md` | Full roadmap and strategic direction - READ THIS FIRST |
| `backend/main.py` | All API endpoints |
| `backend/job_store.py` | SQLite persistence (users, jobs, CVs) |
| `frontend/src/api.ts` | Frontend API client - ALL API calls go through here |
| `frontend/src/types.ts` | TypeScript interfaces |
| `frontend/src/App.tsx` | Main app with routing and layout |
| `src/ats_optimizer.py` | ATS analysis + hybrid scoring orchestration |
| `src/semantic_scorer.py` | Sentence-transformer embeddings + cosine similarity |
| `src/document_parser.py` | Section detection + entity extraction from CVs/JDs |
| `src/entity_taxonomy.py` | 250+ skills, certifications, methodologies taxonomy |
| `ideas.db` | Feature backlog (SQLite) - 50+ ideas tracked |

### Database (SQLite: `jobs.db`)

Three tables: `users`, `jobs`, `cvs`. See `docs/API.md` for full schema.

### API Reference

See `docs/API.md` for all endpoints. Key pattern: most endpoints accept `X-User-ID` header for user scoping.

---

## CODE STYLE (Mandatory)

### Python
- Use type hints on all functions
- Follow patterns in `src/job_application_workflow.py`
- Use `JobStore` class for all database operations
- Encoding: handle Windows cp1252 - use text labels `[OK]` not emojis
- Error handling: graceful degradation (e.g., semantic scorer falls back when unavailable)

### TypeScript / React
- Functional components with hooks (no class components)
- TailwindCSS for all styling (no CSS files, no inline styles)
- All API calls through `frontend/src/api.ts` (never fetch directly in components)
- Normalize API responses in `api.ts` (snake_case -> camelCase)
- Dark mode: use Tailwind's `dark:` prefix classes (class-based dark mode)

### General
- Keep changes minimal and focused - do not refactor surrounding code
- No unnecessary comments, docstrings, or type annotations on code you didn't change
- No over-engineering: no feature flags, no backwards-compat shims, no premature abstractions
- Test before considering work complete

---

## COMMANDS

```bash
# Start backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Start frontend
cd frontend && npm run dev

# TypeScript check (run after any TS changes)
cd frontend && npx tsc --noEmit

# View ideas backlog
python scripts/ideas.py list

# Health check
curl http://localhost:8000/api/health
```

---

## FEATURE DEVELOPMENT WORKFLOW

1. **Check ideas.db** - `python scripts/ideas.py list` - find the relevant idea ID
2. **Mark In Progress**:
   ```python
   python -c "
   import sqlite3; from datetime import datetime
   conn = sqlite3.connect('ideas.db')
   conn.execute('UPDATE ideas SET status=?, updated_at=? WHERE id IN (ID1, ID2)', ('In Progress', datetime.now().isoformat()))
   conn.commit(); conn.close()
   "
   ```
3. **Implement** - follow code style above
4. **Test** - verify manually and run `npx tsc --noEmit` for TS
5. **Mark Done**:
   ```python
   python -c "
   import sqlite3; from datetime import datetime
   conn = sqlite3.connect('ideas.db')
   conn.execute('UPDATE ideas SET status=?, updated_at=? WHERE id IN (ID1, ID2)', ('Done', datetime.now().isoformat()))
   conn.commit(); conn.close()
   "
   ```
6. **Write diary entry** in `docs/journal/PROJECT_DIARY_NNN.md` (must include Quick Resume)

### Diary Entry Quick Resume Template

**Every diary entry MUST start with a Quick Resume section** right after the header. This lets agents quickly regain context when returning after a break.

```markdown
## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: current git branch
- **Track**: current track and status
- **Last session**: 1-2 sentence summary of what was accomplished
- **Next steps**: what to pick up next
- **Blocked/broken**: any known issues, or "Nothing"
- **Ideas backlog**: notable new/high-priority ideas if any
```

---

## HANDOVER PROTOCOL

The user will switch you (Gemini) in when a task matches your strengths. Here is how handovers work:

### You will receive tasks when:
- **Bulk file operations**: Changes touching 5+ files with repetitive patterns
- **Boilerplate generation**: Unit tests, type stubs, repetitive component scaffolding
- **Repo-wide refactors**: Renaming, pattern replacement across many files
- **Large context analysis**: Understanding cross-cutting concerns across the full codebase
- **Documentation generation**: API docs, type documentation, test plans

### You should suggest switching back to Claude when:
- The task requires an **architectural decision** (new patterns, schema changes, scoring formula changes)
- You encounter an **ambiguity** in how something should work
- The change would affect **core business logic** (ATS scoring, workflow pipeline, LLM integration)
- You need to **design a new feature** from scratch (Claude plans, you implement)

### CRITICAL: Never run alongside Claude
- You and Claude **cannot see each other** and have **no coordination mechanism**
- If both agents are active simultaneously, you will conflict: killing each other's processes, fighting over ports, editing the same files
- The handover is strictly **turn-based**: the user must fully exit Claude before starting you, and fully exit you before returning to Claude
- **Do not** start/stop/kill backend or frontend services unless your TODO.md task specifically requires it -- Claude may have left them running intentionally
- If you need to restart a service, first check for stale processes: `netstat -ano | findstr :8000`

### Handover artifacts:
- Check `TODO.md` in the project root for instructions from Claude
- When done, write a summary of what you changed in `TODO.md` so Claude can review
- If you created a diary entry, note its number in `TODO.md`

---

## FILES TO NOT COMMIT

`jobs.db`, `ideas.db`, `ideas.html`, `.env`, `.claude/settings.local.json`, `CLAUDE.local.md`, `GEMINI.md`

---

## REFERENCE DOCS

| File | What it contains |
|------|-----------------|
| `MASTER_VISION.md` | Full roadmap, architecture diagram, decision log, track status |
| `docs/ARCHITECTURE.md` | Directory structure, system overview |
| `docs/API.md` | All endpoints, routes, database schema |
| `docs/journal/PROJECT_DIARY_*.md` | Progress history (001-017 so far) |
| `docs/raw/competitors-ux/` | UX research on LinkedIn, Otta, Wellfound, etc. |
| `ideas.db` | Feature backlog - view with `python scripts/ideas.py list` |

---

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Frontend not connecting | Check backend running on port 8000, check `vite.config.ts` proxy |
| API 422 errors | Check FormData field names match backend expectations |
| Unicode/emoji errors | Use text labels `[OK]` not emojis (Windows cp1252 encoding) |
| TypeScript errors | Run `cd frontend && npx tsc --noEmit` to see full error list |
| Import errors in Python | Ensure venv is activated: `.\venv\Scripts\Activate.ps1` |
| `workflow_available: false` | Check for stale processes first: `netstat -ano \| findstr :8000` then kill zombie PIDs with `taskkill /F /PID <pid>`. Only investigate imports after confirming a fresh process is serving. |
| Backend restart has no effect | Uvicorn child processes survive parent kill on Windows. Verify port is free before restarting. |
| "Was working before, now broken" | Suspect stale processes or port conflicts before assuming missing dependencies. Run `tasklist \| findstr python` to find zombies. |

### Debugging Protocol

When investigating backend errors, **always follow this order**:

1. **Check port ownership first**: `netstat -ano | findstr :8000 | findstr LISTENING`
2. **Kill stale processes**: `taskkill /F /PID <pid>` for any zombies
3. **Restart on clean port**: Verify port is free, then start server
4. **Check health**: `curl http://localhost:8000/api/health`
5. **Only then** investigate code/dependency issues if health still fails on a fresh process

---

**Remember: Claude is the Lead Architect. When in doubt about design decisions, ask the user to consult Claude.**
