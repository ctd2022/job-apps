# Architecture

## System Overview

```
User Browser (5173) → Vite Dev Server → FastAPI (8000) → LLM Backends
                                                         ├── Ollama (11434)
                                                         ├── Llama.cpp (8080)
                                                         └── Gemini (Cloud)
```

## Directory Structure

```
job_applications/
├── MASTER_VISION.md         ← Strategic direction
├── CLAUDE.md                ← Claude Code instructions
│
├── src/                     ← Core Python modules
│   ├── job_application_workflow.py  (Main workflow)
│   ├── docx_templates.py            (DOCX generation)
│   ├── ats_optimizer.py             (ATS + hybrid scoring)
│   ├── semantic_scorer.py           (Semantic embeddings)
│   ├── document_parser.py           (Section/entity extraction)
│   ├── entity_taxonomy.py           (Skills/certs taxonomy)
│   ├── llm_backend.py               (Multi-backend support)
│   └── generate_output.py           (Output generation)
│
├── backend/                 ← FastAPI REST API
│   ├── main.py              (API endpoints)
│   ├── job_processor.py     (Background tasks)
│   └── job_store.py         (SQLite persistence: users, jobs, CVs)
│
├── frontend/                ← React Web UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NewApplication.tsx
│   │   │   ├── ApplicationHistory.tsx
│   │   │   ├── JobDetail.tsx
│   │   │   └── FilePreview.tsx
│   │   ├── api.ts           (API client + theme utilities)
│   │   ├── types.ts         (TypeScript interfaces)
│   │   └── App.tsx          (Main app with routing)
│   ├── package.json
│   └── vite.config.ts       (Dev server + API proxy)
│
├── scripts/                 ← CLI entry points
│   ├── run_workflow.py      (Main CLI workflow)
│   ├── ideas.py             (Ideas database CLI)
│   └── ideas_html.py        (Generate interactive ideas HTML)
│
├── inputs/                  ← User data (CVs, job descriptions)
├── outputs/                 ← Generated applications
│
└── docs/
    ├── API.md               ← API reference
    ├── ARCHITECTURE.md      ← This file
    └── journal/             ← Progress history (PROJECT_DIARY_*.md)
```

## Key Files

| File | Purpose |
|------|---------|
| `MASTER_VISION.md` | Strategic direction and roadmap |
| `backend/main.py` | API endpoints |
| `backend/job_store.py` | SQLite persistence |
| `frontend/src/api.ts` | Frontend API client |
| `frontend/src/App.tsx` | Main app with routing |
| `ideas.db` | Feature tracking database |

## LLM Backends

| Backend | Port | Notes |
|---------|------|-------|
| Ollama | 11434 | Local, default |
| Llama.cpp | 8080 | Local, manual start |
| Gemini | Cloud | Requires API key in `.env` |
