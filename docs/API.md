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
| PATCH | `/api/jobs/{id}/profile` | Toggle inclusion in position profiling corpus `{"include": bool}` |
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
| GET/POST | `/api/profile/certifications` | List / create certification records (Idea #240) |
| PUT | `/api/profile/certifications/reorder` | Reorder certifications |
| PUT/DELETE | `/api/profile/certifications/{id}` | Update / delete certification |
| GET/POST | `/api/profile/skills` | List / create skill records (Idea #240) |
| PUT/DELETE | `/api/profile/skills/{id}` | Update / delete skill |
| GET/POST | `/api/profile/professional-development` | List / create professional development items — 6 types, promotion flow to Certifications (Idea #243) |
| PUT | `/api/profile/professional-development/reorder` | Reorder PD items |
| PUT/DELETE | `/api/profile/professional-development/{id}` | Update / delete PD item |
| GET/POST | `/api/issuing-organisations` | List / create issuing organisations (Idea #281) |
| PUT/DELETE | `/api/issuing-organisations/{id}` | Update / delete issuing organisation |
| GET/POST | `/api/profile/education` | List / create education records |
| PUT | `/api/profile/education/reorder` | Reorder education entries |
| PUT/DELETE | `/api/profile/education/{id}` | Update / delete education record |
| GET | `/api/profile/assemble-cv` | Render all profile sections as CV text — returns `contact_header`, `summary_text`, `experience_text`, `education_text`, `certifications_text`, `skills_text`, `professional_development_text`, and `sections` array `[{key, label, text, visible}]` in user-configured order |
| POST | `/api/profile/sync-from-cv` | Parse `<!-- JOB:id -->` markers from CV text and update job history |
| GET | `/api/position-profile` | Aggregate ATS details from included jobs — skill frequency, match rates, consistent gaps, strengths, role distribution (Idea #242) |

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
| `/profile` | CandidateProfile | Section config, summary, personal info, issuing orgs, certifications, PD, job history, education, skills, CV preview |
| `/cv-coach` | CvCoach | Live CV scoring, summary generator, version history |
| `/cvs` | CVManager | CV library, version browser |
| `/new` | NewApplication | Create new job application |
| `/history` | ApplicationHistory | Full application list with filters + profile corpus checkboxes |
| `/position-profile` | PositionProfile | Cross-job skill frequency analysis, gaps, strengths, role distribution |
| `/job/:id` | JobDetail | View job details, files, update status |

## Database Schema (SQLite)

**File**: `data/jobs.db`

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

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
    notes TEXT,
    job_title TEXT,
    job_description_text TEXT,
    ats_details TEXT,              -- full ATS analysis JSON
    cv_version_id INTEGER,
    include_in_profile INTEGER DEFAULT 1
);

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

CREATE TABLE cv_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cv_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    change_summary TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE match_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    cv_version_id INTEGER,
    score INTEGER NOT NULL,
    matched INTEGER,
    total INTEGER,
    missing_count INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE candidate_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    full_name TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    linkedin TEXT,
    website TEXT,
    headline TEXT,
    cert_grouping_mode TEXT DEFAULT 'flat',  -- flat | by_org
    summary TEXT,
    section_config TEXT,  -- JSON: [{key, label, visible}] in display order
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE job_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    employer TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    description TEXT,
    details TEXT,           -- free-text synced via <!-- JOB:id --> markers
    display_order INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]', -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE issuing_organisations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_label TEXT,
    colour TEXT NOT NULL DEFAULT '#6366f1',
    logo_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    issuing_org TEXT NOT NULL,
    issuing_org_id INTEGER REFERENCES issuing_organisations(id),
    date_obtained TEXT,
    no_expiry INTEGER DEFAULT 0,
    expiry_date TEXT,
    credential_id TEXT,
    credential_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    name TEXT NOT NULL,
    category TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE professional_development (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    type TEXT NOT NULL,   -- Certification | Course / Training | Degree / Qualification | Professional Membership | Conference / Event | Self-directed
    title TEXT NOT NULL,
    provider TEXT,
    status TEXT NOT NULL DEFAULT 'In Progress',  -- In Progress | Studying | Paused | Completed | Ongoing
    start_date TEXT,
    target_completion TEXT,
    completed_date TEXT,
    leads_to_credential INTEGER DEFAULT 0,
    credential_url TEXT,
    show_on_cv INTEGER DEFAULT 1,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL DEFAULT 'default',
    institution TEXT NOT NULL,
    qualification TEXT NOT NULL,
    grade TEXT,
    field_of_study TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```
