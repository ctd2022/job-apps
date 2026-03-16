# CLAUDE.md - Job Application Workflow

AI-powered tool that generates tailored CVs, cover letters, and ATS analysis.

**Current Status**: Track 3.0 COMPLETE - CV Coach | **Branch**: `main`

---

## IMPORTANT: Start Services Before Testing

**YOU MUST check services are running before any frontend testing:**

```bash
# Check status
curl -s http://localhost:8000/api/health  # Backend (expect JSON)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173  # Frontend (expect 200)

# If not running, start in background:
cd "H:/Stuff2Backup/kaizen/job_applications" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
cd "H:/Stuff2Backup/kaizen/job_applications/frontend" && npm run dev
```

---

## Commands

| Command | Description |
|---------|-------------|
| `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload` | Start backend |
| `cd frontend && npm run dev` | Start frontend |
| `cd frontend && npx tsc --noEmit` | TypeScript check |
| `python "<programme>/scripts/ideas/ideas.py" list --project job_applications` | View ideas backlog |
| `python "<programme>/scripts/ideas/ideas.py" add` | Add new idea |
| `python "<programme>/scripts/ideas/ideas.py" html` | Generate ideas HTML |
| `curl http://localhost:8000/api/health` | Health check |

---

## IMPORTANT: Feature Development Workflow

**YOU MUST funnel ALL new features through `ideas.db` before implementing:**

1. **Capture** → Add idea to database (see below)
2. **Spec** → Every idea must have a description before starting. The description IS the spec — even two sentences is enough for a small fix. Set it: `ideas.py update ID --description "..."`. No discrimination on size.
3. **Start Work** → The FIRST command — before reading any files or making any changes — is to mark In Progress (records `started_at` for time tracking). The script blocks this if description is empty.
4. **Plan** → Enter plan mode, explore codebase, design approach
5. **Implement** → Follow the plan
6. **Complete** → Update status to "Done" (auto-calculates `actual_time` from `started_at`). If you forgot to mark In Progress first, you MUST pass `--actual-time` — the script will error otherwise.

### Updating Idea Status

Ideas are managed at programme level. Use the programme CLI:

```bash
# Mark idea as In Progress
python "H:/Stuff2Backup/kaizen/programme/scripts/ideas/ideas.py" update ID --status "In Progress"

# Mark idea as Done
python "H:/Stuff2Backup/kaizen/programme/scripts/ideas/ideas.py" update ID --status "Done"

# List this project's ideas
python "H:/Stuff2Backup/kaizen/programme/scripts/ideas/ideas.py" list --project job_applications
```

**Status values**: Idea -> In Progress -> Done (or Rejected/Deferred)

### Capturing User Suggestions

**When the user suggests a feature or improvement, add it via the programme CLI:**

```bash
python "H:/Stuff2Backup/kaizen/programme/scripts/ideas/ideas.py" add
# Set stream=career-tools, project=job_applications when prompted
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

### Diary Entry Quick Resume Section

**Every diary entry MUST start with a "Quick Resume" section** right after the header. This allows agents to quickly regain context when returning after a break, instead of reading git logs, ideas.db, and multiple files.

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

When starting a new session, read the **latest diary entry's Quick Resume** first.

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
| "Apply Selected" shows no changes / keyword verification all ✗ | **Local LLMs (Ollama llama3.1:8b) are unreliable for keyword injection.** They return the unchanged CV and fabricate the changelog. Switch to Gemini in the backend selector. See `MASTER_VISION.md` → LLM Backend Capability Notes. |
| `workflow_available: false` | **First** check for stale processes: `netstat -ano \| findstr :8000` then kill zombie PIDs with `taskkill /F /PID <pid>`. Only investigate imports after confirming a fresh process is serving. |
| Backend restart seems to have no effect | Uvicorn child processes survive parent kill on Windows. Always verify port is free before restarting. |
| "Was working before, now broken" | Suspect stale processes or port conflicts before assuming missing dependencies. Run `tasklist \| findstr python` to find zombies. |

### Debugging Protocol (for agents)

When investigating backend errors, **always follow this order**:

1. **Check port ownership first**: `netstat -ano | findstr :8000 | findstr LISTENING`
2. **Kill stale processes**: `taskkill /F /PID <pid>` for any zombies
3. **Restart on clean port**: Verify port is free, then start server
4. **Check health**: `curl http://localhost:8000/api/health`
5. **Only then** investigate code/dependency issues if health still fails

### Delegation Lessons

When delegating bug investigation to Gemini via TODO.md:
- **Diagnostic-first**: Ask Gemini to "investigate and report findings" before "fix it"
- **Include known clues**: Share server logs, error messages, and what you've already ruled out
- **Set clear boundaries**: Specify what NOT to change (e.g., "do not modify source code")
- **Stale process warning**: Always mention that Windows zombie processes are a common root cause
- **Feature work**: Always create a feature branch first; Gemini works on it, does not commit; user verifies app before Claude commits and merges

---

## Files to NOT Commit

`jobs.db`, `ideas.db`, `ideas.html`, `.env`, `.claude/settings.local.json`, `CLAUDE.local.md`

---

## Programme Feedback Loop

When you discover a workflow improvement, new convention, or fix a recurring problem — ask whether it applies beyond this project. If it does, flag it for programme-level update (templates, CLAUDE.md, GEMINI.md). New projects should inherit lessons from old ones, not rediscover them.

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

### CRITICAL: Never run both agents simultaneously
- Claude and Gemini **cannot see each other** and have **no coordination mechanism**
- If both are active, they will conflict: killing each other's processes, fighting over ports, editing the same files
- The handover is strictly **turn-based**: one agent works, finishes, then the other starts
- **User responsibility**: Fully stop one agent (Ctrl+C / exit) before switching to the other
- If you (Claude) have background tasks running (servers, builds), note them in TODO.md so Gemini doesn't interfere

### Handover protocol:
1. **Claude finishes all active work** and stops any background tasks that Gemini might conflict with
2. **Claude creates a feature branch** (`git checkout -b feature/idea-NNN-short-name`) and notes it in `TODO.md`
3. **Claude writes instructions** into `TODO.md` with specific file paths, patterns to follow, and acceptance criteria
4. **User fully exits Claude**, then switches to Gemini CLI - Gemini reads `GEMINI.md` and `TODO.md`
5. **Gemini implements on the feature branch** — all changes stay on that branch, nothing merged to `main`
6. **Gemini does NOT commit** — when done, it starts the services and tells the user to verify the app manually before committing
7. **User checks the app**, then **fully exits Gemini** and switches back to Claude
8. **Claude reviews** via `TODO.md` and git diff, then commits and merges to `main`

### Branch naming
- Always `feature/idea-NNN-short-description` for idea-tracked work
- Claude creates the branch before writing TODO.md so Gemini just checks it out

### Key files:
- `GEMINI.md` - Gemini's project context (mirrors CLAUDE.md but scoped for secondary role)
- `TODO.md` - Handover instructions and completion summaries between agents

**Last Updated**: 11 March 2026
