# Job Application Workflow

AI-powered tool that generates tailored CVs, cover letters, and ATS analysis using local LLMs.

## Setup

```bash
# Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your config
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Usage

1. Start backend on port 8000
2. Start frontend on port 5173
3. Open http://localhost:5173
4. Upload a job description, select a CV version, generate tailored output

## Architecture

```
job_applications/
├── backend/
│   └── main.py          # FastAPI endpoints
├── frontend/
│   └── src/
│       ├── api.ts       # All API calls
│       ├── types.ts     # TypeScript types
│       └── components/  # React components
├── data/
│   └── jobs.db          # SQLite database
└── docs/                # Architecture, API docs, diary
```

## Key Docs

- `docs/ARCHITECTURE.md` — system overview
- `docs/API.md` — endpoints and schema
- `MASTER_VISION.md` — roadmap
