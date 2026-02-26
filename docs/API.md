# API Reference

All endpoints (except `/api/users` and `/api/health`) support `X-User-ID` header for user scoping.

## Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |
| GET | `/api/users/{id}` | Get user details |
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs/{id}` | Get job status |
| DELETE | `/api/jobs/{id}` | Delete a job |
| PATCH | `/api/jobs/{id}/outcome` | Update application outcome status |
| GET | `/api/jobs/{id}/files` | List output files |
| GET | `/api/jobs/{id}/files/{name}` | Download file |
| GET | `/api/jobs/{id}/files/{name}/content` | Get file content for preview |
| WS | `/api/ws/jobs/{id}` | WebSocket for real-time progress |
| GET | `/api/cvs` | List stored CVs |
| POST | `/api/cvs` | Upload and store a CV |
| GET | `/api/cvs/{id}` | Get CV details |
| DELETE | `/api/cvs/{id}` | Delete a CV |
| PUT | `/api/cvs/{id}/default` | Set CV as default |
| GET | `/api/backends` | List available LLM backends |
| GET | `/api/applications` | List past applications (supports `?outcome_status=` filter) |
| GET | `/api/metrics` | Get application funnel metrics |
| GET | `/api/health` | Health check |
| PUT | `/api/cvs/{id}/content` | Save edited CV text (creates new version) |
| GET | `/api/cvs/{id}/versions` | List CV version history |
| GET | `/api/cv-versions/{id}` | Get a specific version with content |
| POST | `/api/cv-coach/assess` | Job-agnostic CV quality score + coaching suggestions (no LLM) |
| POST | `/api/cv-coach/generate-summary` | LLM-generated professional summary from CV text, PII-scrubbed; optional `job_description` to tailor to a role (Idea #55) |
| GET | `/api/jobs/{id}/ats-analysis` | Full ATS details + gap analysis + keyword placement + evidence gap details |
| POST | `/api/jobs/{id}/apply-suggestions` | Inject selected keywords into CV via LLM |
| GET/PUT | `/api/profile` | Get / update candidate personal info |
| GET/POST | `/api/profile/job-history` | List / create job history records |
| PUT/DELETE | `/api/profile/job-history/{id}` | Update / delete a job history record |
| PUT | `/api/profile/job-history/reorder` | Reorder job history entries |
| GET | `/api/profile/assemble-cv` | Render job history as CV EXPERIENCE text + formatted contact header |
| POST | `/api/profile/sync-from-cv` | Parse `<!-- JOB:id -->` markers from CV text and update job history |

## CV Coach — Generate Summary

**POST** `/api/cv-coach/generate-summary`

Request body:
```json
{
  "cv_text": "string (required)",
  "job_description": "string (optional — tailors summary to role)",
  "backend_type": "gemini | ollama | llamacpp (default: gemini)",
  "model_name": "string (optional, uses backend default)"
}
```

Response:
```json
{ "summary": "3-4 sentence professional summary as plain text" }
```

- CV text is PII-scrubbed (name, email, phone, location, employer names) before the LLM call
- Real values are restored from the LLM output before returning
- Requires `X-User-ID` header for PII profile lookup

## Frontend Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Stats, active jobs, recent applications |
| `/new` | NewApplication | Create new job application |
| `/history` | ApplicationHistory | Full application list with filters |
| `/job/:id` | JobDetail | View job details, files, update status |

## Database Schema (SQLite)

**File**: `jobs.db`

```sql
-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Jobs table
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    status TEXT,
    progress INTEGER,
    current_step TEXT,
    company_name TEXT,
    backend_type TEXT,
    backend_model TEXT,
    output_dir TEXT,
    ats_score INTEGER,
    error TEXT,
    created_at TEXT,
    completed_at TEXT,
    outcome_status TEXT DEFAULT 'draft',
    submitted_at TEXT,
    response_at TEXT,
    outcome_at TEXT,
    notes TEXT
);

-- CVs table
CREATE TABLE cvs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default',
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
```
