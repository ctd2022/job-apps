---
inherits:
  - ../CLAUDE.md
---

# CLAUDE.md - Job Application Workflow

AI-powered tool that generates tailored CVs, cover letters, and ATS analysis.

---

## IMPORTANT: Start Services Before Testing

**Check services are running before any frontend testing:**

```bash
curl -s http://localhost:8000/api/health  # Backend (expect JSON)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173  # Frontend (expect 200)

# If not running, start in background:
cd "C:/Users/davidgp2022/My Drive/Kaizen/job_applications" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
cd "C:/Users/davidgp2022/My Drive/Kaizen/job_applications/frontend" && npm run dev
```

---

## Commands

| Command | Description |
|---------|-------------|
| `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` | Start backend |
| `cd frontend && npm run dev` | Start frontend |
| `cd frontend && npx tsc --noEmit` | TypeScript check |
| `curl http://localhost:8000/api/health` | Health check |

---

## Ideas Workflow

All features tracked in `ideas.db` — funnel through this CLI, don't implement ad-hoc.

```bash
IDEAS='python "C:/Users/davidgp2022/My Drive/Kaizen/programme/scripts/ideas/ideas.py"'

$IDEAS list --project job_applications --status Idea
# Categories: Feature|UI|Bug|Architecture|Research  Complexity/Impact: Low|Medium|High  Priority: 1-5
$IDEAS add --title "Short title" --stream career-tools --project job_applications
$IDEAS update ID --status "In Progress"
$IDEAS update ID --status "Done"
```

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
| `workflow_available: false` | Check for stale processes: `netstat -ano \| findstr :8000` then kill zombie PIDs with `taskkill /F /PID <pid>`. Only investigate imports after confirming a fresh process is serving. |
| Backend restart seems to have no effect | Uvicorn child processes survive parent kill on Windows. Always verify port is free before restarting. |
| "Was working before, now broken" | Suspect stale processes or port conflicts before assuming missing dependencies. Run `tasklist \| findstr python` to find zombies. |

### Debugging Protocol

When investigating backend errors, **always follow this order**:

1. **Check port ownership first**: `netstat -ano | findstr :8000 | findstr LISTENING`
2. **Kill stale processes**: `taskkill /F /PID <pid>` for any zombies
3. **Restart on clean port**: Verify port is free, then start server
4. **Check health**: `curl http://localhost:8000/api/health`
5. **Only then** investigate code/dependency issues if health still fails

### Uvicorn --reload on Windows

`--reload` silently fails to restart the worker on Windows — old code keeps serving while netstat shows the port as occupied. **Always start without `--reload`** and restart manually when needed. Kill all python processes, wait for port to release, start fresh.

---

## Agent Delegation: Gemini CLI

**Turn-based only — never run both agents simultaneously.** Claude and Gemini have no coordination mechanism and will conflict over ports and files.

### Handover protocol
1. Claude finishes all active work and stops background tasks
2. Claude writes instructions into `TODO.md` (file paths, patterns, acceptance criteria)
3. User fully exits Claude, switches to Gemini — Gemini reads `GEMINI.md` and `TODO.md`
4. Gemini implements and writes summary back into `TODO.md`
5. User fully exits Gemini, switches back to Claude — Claude reviews via `TODO.md` and git diff

---

## Files to NOT Commit

`jobs.db`, `ideas.db`, `ideas.html`, `.env`, `.claude/settings.local.json`, `CLAUDE.local.md`
