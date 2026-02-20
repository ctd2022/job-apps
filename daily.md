# Daily Quick Reference

## Start Services

```powershell
# Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (separate terminal)
cd frontend && npm run dev
```

## Verify

- Backend: http://localhost:8000/api/health
- Frontend: http://localhost:5173

## Ideas Backlog

```powershell
python scripts/ideas_html.py && start ideas.html
```

## If Services Won't Start

```powershell
# Find zombie processes
netstat -ano | findstr :8000 | findstr LISTENING

# Kill them
taskkill /F /PID <pid>
```

## Agents

- Only run one at a time (Claude or Gemini, never both)
- Check `TODO.md` for pending handover tasks
- Latest diary entry has Quick Resume for project state
