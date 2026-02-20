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
