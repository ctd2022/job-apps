# CLAUDE.md - Project Context for Claude Code

## Project Overview

**Job Application Workflow** - AI-powered tool that generates tailored CVs, cover letters, and ATS analysis for job applications.

**Current Status**: Track 2 COMPLETE - Validation Phase

---

## Quick Start Commands

### Run Web UI (Track 2)

**Terminal 1 - Backend:**
```powershell
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```powershell
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications\frontend"
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Run CLI (Track 1)
```powershell
.\venv\Scripts\Activate.ps1
python scripts\run_workflow.py --cv inputs\davidcv.txt --job inputs\job_descriptions\test.txt --backend ollama
```

---

## Architecture

```
User Browser (5173) → Vite Dev Server → FastAPI (8000) → LLM Backends
                                                         ├── Ollama (11434)
                                                         ├── Llama.cpp (8080)
                                                         └── Gemini (Cloud)
```

---

## Directory Structure

```
job_applications/
├── MASTER_VISION.md         ← Strategic direction
├── QUICKSTART.md            ← How to run
├── CLAUDE.md                ← This file (project context)
│
├── src/                     ← Core Python modules
│   ├── job_application_workflow.py  (Main workflow)
│   ├── docx_templates.py            (DOCX generation)
│   ├── ats_optimizer.py             (ATS analysis)
│   ├── llm_backend.py               (Multi-backend support)
│   └── generate_output.py           (Output generation)
│
├── backend/                 ← FastAPI REST API
│   ├── main.py              (API endpoints)
│   ├── job_processor.py     (Background tasks)
│   └── job_store.py         (In-memory job tracking)
│
├── frontend/                ← React Web UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NewApplication.tsx
│   │   │   └── ApplicationHistory.tsx
│   │   ├── api.ts           (API client)
│   │   ├── types.ts         (TypeScript interfaces)
│   │   └── App.tsx          (Main app with routing)
│   ├── package.json
│   └── vite.config.ts       (Dev server + API proxy)
│
├── scripts/                 ← CLI entry points
│   └── run_workflow.py
│
├── inputs/                  ← User data
│   ├── davidcv.txt
│   └── job_descriptions/
│
├── outputs/                 ← Generated applications
│   └── [job-name]_[BACKEND]_[timestamp]/
│
└── docs/
    └── journal/             ← Progress history
        ├── PROJECT_DIARY_006.md  (Track 2 Week 2 - Frontend)
        ├── PROJECT_DIARY_007.md  (Claude Code adoption)
        └── PROJECT_DIARY_008.md  (Track 2 Week 3 - WebSocket)
```

---

## Current Status: Track 2 COMPLETE

### Completed
- [x] Track 1: CLI workflow (production ready)
- [x] Track 2 Week 1: FastAPI backend
- [x] Track 2 Week 2: React frontend (end-to-end working)
- [x] Track 2 Week 3: Polish & WebSockets - COMPLETE (23 Jan 2026)
  - [x] WebSocket integration for real-time progress
  - [x] File preview in browser (markdown rendering)
  - [x] Error boundaries and loading states
  - [x] All three backends tested (Ollama, Llama.cpp, Gemini)

### Next Phase: Validation
- [ ] Use web UI for 10-20 real job applications
- [ ] Track success metrics (interviews, responses)
- [ ] Decide on Track 3 (SaaS) based on results

### Deferred Enhancements
- [ ] Llama.cpp model selection (scan GGUF files from models directory)
- [ ] SQLite for persistent job history
- [ ] Profile management features

---

## Key Files to Reference

| File | Purpose |
|------|---------|
| `MASTER_VISION.md` | Strategic direction and roadmap |
| `docs/journal/PROJECT_DIARY_008.md` | Track 2 Week 3 - WebSocket integration |
| `docs/journal/PROJECT_DIARY_009.md` | Track 2 Complete - File preview, backends tested |
| `backend/main.py` | API endpoints |
| `frontend/src/api.ts` | Frontend API client |
| `frontend/src/components/NewApplication.tsx` | Job submission UI |
| `frontend/src/components/FilePreview.tsx` | File preview with markdown |
| `.env` | API keys (GEMINI_API_KEY) |

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs/{id}` | Get job status |
| GET | `/api/jobs/{id}/files` | List output files |
| GET | `/api/jobs/{id}/files/{name}` | Download file |
| GET | `/api/jobs/{id}/files/{name}/content` | Get file content for preview |
| WS | `/api/ws/jobs/{id}` | WebSocket for real-time progress |
| GET | `/api/backends` | List available LLM backends |
| GET | `/api/applications` | List past applications |
| GET | `/api/health` | Health check |

---

## Coding Conventions

### Python (backend, src)
- Use type hints
- Follow existing patterns in `job_application_workflow.py`
- Use `JobStore` for job tracking

### TypeScript/React (frontend)
- Functional components with hooks
- TailwindCSS for styling
- Use `api.ts` for all API calls
- Normalize API responses in `api.ts`

### General
- Keep changes minimal and focused
- Test changes before committing
- Update relevant diary entry for significant changes

---

## Git Branch

Current branch: `track2-web-ui`

---

## LLM Backends

| Backend | Port | Notes |
|---------|------|-------|
| Ollama | 11434 | Local, default |
| Llama.cpp | 8080 | Local, manual start |
| Gemini | Cloud | Requires API key |

---

## Common Tasks

### Add a new API endpoint
1. Edit `backend/main.py`
2. Update `frontend/src/api.ts`
3. Update `frontend/src/types.ts` if new types needed

### Modify frontend component
1. Edit component in `frontend/src/components/`
2. Test at http://localhost:5173

### Run backend only
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## Troubleshooting

### Frontend not connecting to backend
- Check backend is running on port 8000
- Check Vite proxy config in `frontend/vite.config.ts`

### API 422 errors
- Check field names match between frontend FormData and backend expectations
- See `PROJECT_DIARY_006.md` for field name mapping

### Ollama not responding
- Run `ollama list` to check models
- Run `ollama serve` if not running

### Unicode/Emoji errors on Windows
- Windows console uses cp1252 encoding, can't display emojis
- Use text labels like `[OK]`, `[WARN]` instead of emojis in print statements
- Already fixed in `backend/main.py` and `src/ats_optimizer.py`

---

**Last Updated**: 23 January 2026
**Current Phase**: Track 2 COMPLETE - Validation Phase

---

## Llama.cpp Configuration

**Server Location**: `C:\Users\davidgp2022\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe`

**Models Directory**: `C:\Users\davidgp2022\models\`

**Available Models**:
- `Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf` (recommended - fits in VRAM)
- `Mistral-Small-Instruct-2409-Q3_K_M.gguf`
- `Qwen2.5-14B-Instruct-Q4_K_M.gguf`
- `Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf`
- `gemma-3-27b-it-q4_k_m.gguf` (too large for GPU - needs CPU offload)

**Start Command**:
```powershell
llama-server.exe -m "C:\Users\davidgp2022\models\Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf" --port 8080 --ctx-size 8192
```
