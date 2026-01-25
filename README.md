# Job Application Workflow

AI-powered tool that generates tailored CVs, cover letters, and ATS analysis for job applications.

## Features

- **Tailored CV Generation** - Creates job-specific CVs in DOCX format
- **Cover Letter Generation** - Professional cover letters matched to job requirements
- **ATS Scoring & Analysis** - Keyword matching, section-level analysis, gap identification
- **Multi-Backend Support** - Ollama (local), Llama.cpp (local), or Gemini (cloud)
- **Web UI** - Dashboard, real-time progress, file preview
- **Multi-User Support** - Isolated profiles with separate CVs and job history
- **Outcome Tracking** - Track application status from submission to offer

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- An LLM backend (Ollama recommended for local use)

### Run the Web UI

**Terminal 1 - Backend:**
```bash
cd "path/to/job_applications"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd "path/to/job_applications/frontend"
npm install  # first time only
npm run dev
```

**Access:** http://localhost:5173

### Run CLI Only
```bash
python scripts/run_workflow.py \
  --cv inputs/yourcv.txt \
  --job inputs/job_description.txt \
  --company "Company Name" \
  --backend ollama
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Python, FastAPI, SQLite |
| LLM | Ollama, Llama.cpp, Google Gemini |
| Output | DOCX (python-docx) |

## Project Structure

```
job_applications/
├── backend/          # FastAPI REST API
├── frontend/         # React web application
├── src/              # Core Python modules (ATS, LLM, workflow)
├── scripts/          # CLI entry points
├── inputs/           # CV and job description files
├── outputs/          # Generated applications
└── docs/             # Documentation and journals
```

## Documentation

- `MASTER_VISION.md` - Roadmap and strategic direction
- `docs/journal/` - Development diary and progress history
- `docs/API.md` - API endpoints and database schema

## Current Status

**Track 2.8 In Progress** - Hybrid Semantic ATS Scoring

See `MASTER_VISION.md` for detailed roadmap.

## License

Private project - not for distribution.
