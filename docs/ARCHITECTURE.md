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
│   ├── job_store.py         (SQLite persistence: users, jobs, CVs, profiles, certifications, skills)
│   ├── cv_assembler.py      (Render job history / certs / skills → CV text + parse-back markers)
│   └── pii_scrubber.py      (Strip/restore employer names + personal info pre-LLM)
│
├── frontend/                ← React Web UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── CandidateProfile.tsx  (Profile CRUD page — personal info + job history + certifications + skills)
│   │   │   ├── CvCoach.tsx           (CV coaching — live score, suggestions, version history, Pull from Profile, Generate Summary (Idea #55))
│   │   │   ├── CVManager.tsx         (CV library — upload, rename, version browser)
│   │   │   ├── CVTextEditor.tsx      (Inline CV editor + ATS feedback + Pull from Profile)
│   │   │   ├── GapAnalysis.tsx       (Evidence/critical/semantic/experience gap cards + section badges)
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
| `backend/job_store.py` | SQLite persistence (users, jobs, CVs, candidate profiles, job history, certifications, skills) |
| `backend/cv_assembler.py` | Render job history / certs / skills into CV text; format contact header; parse `<!-- JOB:id -->` markers back |
| `backend/pii_scrubber.py` | Strip employer names + PII before LLM; restore in response |
| `frontend/src/api.ts` | Frontend API client |
| `frontend/src/App.tsx` | Main app with routing |
| `ideas.db` | Feature tracking database |

## Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/users` | List users |
| GET/POST | `/api/cvs` | List / upload CVs |
| GET | `/api/cvs/{id}` | Get CV with content |
| PUT | `/api/cvs/{id}/content` | Save edited CV (creates new version) |
| GET | `/api/cvs/{id}/versions` | List CV versions |
| GET | `/api/cv-versions/{id}` | Get single version with content |
| POST | `/api/cv-coach/assess` | Job-agnostic CV quality assessment (Track 3.0) |
| POST | `/api/cv-coach/generate-summary` | LLM-generated 3-4 sentence professional summary, PII-scrubbed, optionally tailored to a JD (Idea #55) |
| POST | `/api/jobs` | Create job application |
| GET | `/api/jobs/{id}/ats` | ATS score against JD |
| GET | `/api/jobs/{id}/ats-analysis` | Full ATS details: hybrid scoring, gap analysis, keyword placement suggestions (Idea #100), evidence gap details with section badges (Idea #78) |
| POST | `/api/jobs/{id}/apply-suggestions` | Inject keywords into CV via LLM |
| GET/PUT | `/api/profile` | Get/update candidate personal info (Idea #233) |
| GET/POST | `/api/profile/job-history` | List / create job history records |
| PUT/DELETE | `/api/profile/job-history/{id}` | Update / delete job history record |
| PUT | `/api/profile/job-history/reorder` | Reorder job history |
| GET/POST | `/api/profile/certifications` | List / create certification records (Idea #240) |
| PUT | `/api/profile/certifications/reorder` | Reorder certifications |
| PUT/DELETE | `/api/profile/certifications/{id}` | Update / delete certification |
| GET/POST | `/api/profile/skills` | List / create skill records (Idea #240) |
| PUT/DELETE | `/api/profile/skills/{id}` | Update / delete skill |
| GET | `/api/profile/assemble-cv` | Render job history + certs + skills as CV section texts + contact header |
| POST | `/api/profile/sync-from-cv` | Parse JOB markers from CV and update job history details |

## LLM Backends

| Backend | Port | Notes |
|---------|------|-------|
| Ollama | 11434 | Local, default |
| Llama.cpp | 8080 | Local, manual start |
| Gemini | Cloud | Requires API key in `.env` |
