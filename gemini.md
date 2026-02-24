---
inherits:
  - ../../../GEMINI.md
---

# GEMINI.md - Job Application Workflow

**Role**: Secondary agent. Claude Code is Lead Architect. Do not make architectural decisions — escalate to Claude.

---

## Constraints

### You MUST NOT:
- Change architectural patterns, rename files/directories, or alter database schema without user approval
- Add new dependencies without user approval
- Change the hybrid scoring formula (Lexical 55% + Semantic 35% + Evidence 10%)
- Push to git, create commits, or stage files — leave changes unstaged for Claude to review
- Fix pre-existing warnings in files you weren't asked to change — only ensure you introduced no *new* errors
- Replace imports with stubs or placeholders — if an import doesn't resolve, investigate the path
- Expand scope to chase a cascading error — if fixing a side effect requires touching a file outside TODO.md scope, STOP, revert, and try a different approach

---

## IMPORTANT: Start Services Before Testing

```bash
curl -s http://localhost:8000/api/health  # Backend (expect JSON)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173  # Frontend (expect 200)
```

Do not start/stop services unless your TODO.md task specifically requires it.

---

## Commands

```bash
# Start backend (no --reload on Windows — see Troubleshooting)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Start frontend
cd frontend && npm run dev

# TypeScript check (run after any TS changes)
cd frontend && npx tsc --noEmit

# Health check
curl http://localhost:8000/api/health
```

---

## Ideas Workflow

All features tracked in `ideas.db` — funnel through this CLI, don't implement ad-hoc.

```bash
IDEAS='python "C:/Users/davidgp2022/My Drive/Kaizen/programme/scripts/ideas/ideas.py"'

$IDEAS list --project job_applications --status Idea
$IDEAS add --title "Short title" --stream career-tools --project job_applications
$IDEAS update ID --status "In Progress"
$IDEAS update ID --status "Done"
```

---

## Accessing Gitignored Files

`TODO.md`, `GEMINI.md`, and `CLAUDE.md` are gitignored. Use `run_shell_command` instead of `read_file`/`write_file`:

```bash
cat TODO.md
sed -i 's/- \[ \] Task 1/- [x] Task 1/' TODO.md
```

---

## Code Style

### Python
- Type hints on all functions; use `JobStore` for all database operations
- Windows encoding: use text labels `[OK]` not emojis (cp1252)
- Graceful degradation (e.g., semantic scorer falls back when unavailable)

### TypeScript / React
- All API calls through `frontend/src/api.ts` (never fetch directly in components)
- Normalize responses in `api.ts` (snake_case → camelCase)
- Dark mode: Tailwind `dark:` prefix classes

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend not connecting | Check backend on port 8000, check `vite.config.ts` proxy |
| API 422 errors | Check FormData field names match backend |
| Unicode/emoji errors | Use text labels `[OK]` not emojis (Windows cp1252) |
| `workflow_available: false` | Check for stale processes: `netstat -ano \| findstr :8000` then `taskkill /F /PID <pid>` |
| Backend restart has no effect | Uvicorn child processes survive parent kill on Windows. Verify port is free before restarting. |
| "Was working before, now broken" | Suspect stale processes before missing dependencies. `tasklist \| findstr python` to find zombies. |
| Ghost socket (dead PID in netstat) | Try a different port (e.g. 8001) to confirm code works, then update `vite.config.ts` proxy. |

### Debugging Protocol

1. **Check port ownership**: `netstat -ano | findstr :8000 | findstr LISTENING`
2. **Kill stale processes**: `taskkill /F /PID <pid>`
3. **Restart on clean port**, then `curl http://localhost:8000/api/health`
4. **Only then** investigate code issues

### Uvicorn --reload on Windows

`--reload` silently fails on Windows — old code keeps serving. Always start without `--reload` and restart manually.

---

## Handover Protocol

**Turn-based only — never run alongside Claude.** No coordination mechanism exists; simultaneous agents will conflict over ports and files.

1. Read `TODO.md` for task instructions
2. Implement — tick off checklist items as you complete them
3. Run acceptance criteria from TODO.md
4. Write completion summary back into `TODO.md` (status: RESOLVED)

### TODO.md task types
- **Implementation tasks**: follow the spec closely — file paths and patterns are reliable
- **Diagnostic/fix tasks**: treat suggested cause as a hypothesis, not a prescription. Investigate symptoms yourself first; if fix doesn't work after 2 attempts, re-diagnose from scratch

### Completion checklist

Before writing your completion summary:
1. `git diff --stat` — confirm only files listed in TODO.md were modified
2. Run every acceptance criterion from TODO.md
3. `cd frontend && npx tsc --noEmit` — no new errors

---

## Files to NOT Commit

`jobs.db`, `ideas.db`, `ideas.html`, `.env`, `.claude/settings.local.json`, `CLAUDE.local.md`, `GEMINI.md`
