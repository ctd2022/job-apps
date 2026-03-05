# MASTER VISION - Job Application Workflow

**Last Updated**: 5 March 2026
**Current Status**: Track 3.0 COMPLETE — CV Coach + Candidate Profile fully built out
**Branch**: `main`
**Next Phase**: Interview Prep (#34 STAR Coach) or Job Title Bullet Suggestions (#59)

---

## Philosophy: Work With ATS, Not Against It

This tool does not game applicant tracking systems. ATS exists to help employers find the right candidates efficiently — undermining that helps no one.

Our goal is **impeccable presentation**: ensuring a candidate's real skills, experience, and evidence are structured and surfaced in the way ATS expects to receive them. No keyword stuffing, no invisible text, no inflated claims.

This creates a three-way win:
- **Job seekers** get fairly evaluated on their actual strengths
- **Employers** receive well-structured applications that their systems can parse correctly
- **Us (the tool)** build something sustainable that doesn't break when ATS vendors tighten their filters

Every feature — ATS scoring, gap analysis, keyword suggestions, CV refinement — should be measured against this principle: *does it help the candidate present their truth more clearly, or does it help them fabricate a better-looking lie?* Only the former belongs here.

---

## 📍 **WHERE WE ARE NOW**

### **✅ Track 1: CLI Workflow** - COMPLETE (Production Ready)

```powershell
python scripts\run_workflow.py \
  --cv inputs\davidcv.txt \
  --job inputs\job_descriptions\company-role.txt \
  --company "Company Name" \
  --backend ollama
```

**Outputs (6 files per job):**
1. `tailored_cv_ollama.md` - Markdown CV (for editing)
2. `tailored_cv_ollama.docx` - **DOCX CV (for submission)** ⭐
3. `cover_letter_ollama.txt` - Text cover letter (for editing)
4. `cover_letter_ollama.docx` - **DOCX cover letter (for submission)** ⭐
5. `ats_analysis_ollama.txt` - ATS report (70-100% = good score)
6. `metadata.json` - Processing details

### **✅ Track 2 Week 1: Backend** - COMPLETE

- FastAPI REST API on `localhost:8000`
- Endpoints: `/api/jobs`, `/api/backends`, `/api/applications`, `/api/health`
- Background task processing
- File upload handling
- Job status tracking

### **✅ Track 2 Week 2: Frontend** - COMPLETE

- React 18 + TypeScript + Vite + TailwindCSS
- Dashboard with stats and recent applications
- New Application page with file upload and backend selection
- Application History with search/filter/sort
- API client with response normalization
- End-to-end job submission working
- DOCX files generated successfully

### **✅ Track 2 Week 3: Polish** - COMPLETE

All tasks completed 23 Jan:
- [x] WebSocket integration for real-time progress (replace polling)
- [x] File preview in browser (markdown rendering)
- [x] Error boundaries and loading states
- [x] Test with all three backends (Ollama, Llama.cpp, Gemini)

### **✅ Track 2.5: Outcome Tracking** - COMPLETE (24 Jan 2026)

**Why This Was MVP**: Cannot validate the system without tracking what happens after applying.

**Features Implemented (ideas #19, #20):**
- [x] Application status workflow: Draft → Submitted → Response → Interview → Offer/Rejected
- [x] Key dates tracking: submitted_at, response_at, outcome_at (auto-set on status change)
- [x] Notes field for communications and feedback
- [x] Success metrics dashboard: funnel visualization, response/interview/offer rates
- [x] History filters by application status
- [x] Inline status editing in expanded row

**Database Changes:**
- Added to `jobs` table: `outcome_status`, `submitted_at`, `response_at`, `outcome_at`, `notes`

### **✅ Track 2.6: Multi-User Support** - COMPLETE (25 Jan 2026)

**Why This Was Important**: Foundation for scaling to multiple users; enables 2-person validation testing.

**Features Implemented (idea #21):**
- [x] Users table and user management (create, list, get)
- [x] User isolation: jobs, CVs, and metrics scoped per user
- [x] Profile selector in header (dropdown + add user button)
- [x] X-User-ID header for API authentication
- [x] localStorage persistence for current user
- [x] Automatic data refresh when switching users

**Database Changes:**
- Added `users` table: `id`, `name`, `created_at`
- Added `user_id` column to `jobs` and `cvs` tables
- Migration: existing data assigned to 'default' user

**API Changes:**
- New endpoints: `GET/POST /api/users`, `GET /api/users/{id}`
- All existing endpoints now accept `X-User-ID` header for user scoping

### **✅ Track 2.7: UI Improvements Bundle** - COMPLETE (25 Jan 2026)

**Features Implemented (ideas #8, #42):**
- [x] **Dark Mode** (#8): Class-based Tailwind dark mode with Sun/Moon toggle in header, localStorage persistence, system preference default
- [x] **Paste Job Description** (#42): Upload/Paste toggle for job descriptions, converts pasted text to File on submission

### **🔄 Track 2.8: Hybrid Semantic ATS Scoring** - 2.8.2 COMPLETE (26 Jan 2026)

**Why This Matters**: Current ATS scoring uses keyword matching. Modern systems use hybrid scoring combining lexical matches with semantic embeddings for meaning-based similarity.

**Research**: See `docs/raw/GPT-SuperList-SemanticSearch.md` for full specification.

**Core Architecture Change**:
```
Final Score = (Lexical × 0.55) + (Semantic × 0.35) + (Evidence × 0.10)
              + Constraint penalties/caps (must-haves, years, certs)
```

**Implementation Phases**:

| Phase | Component | Description | Status |
|-------|-----------|-------------|--------|
| 2.8.1 | Foundation | Section detection, entity extraction (NER) | **COMPLETE** |
| 2.8.2 | Embeddings | sentence-transformers, cosine similarity | **COMPLETE** |
| 2.8.3 | Constraint Penalties | Must-haves, years, certifications caps | Optional |
| 2.8.4 | Gap Analysis | Critical missing terms, semantic gaps | Future |
| 2.8.5 | UI Integration | Heatmap overlay, explainability panel | Future |

**Track 2.8.1 Completed** (25 Jan 2026):
- `src/entity_taxonomy.py`: 250+ hard skills, 60+ soft skills, certifications, methodologies, domains
- `src/document_parser.py`: Section detection, entity extraction, evidence strength scoring
- ATS report now includes section-level analysis

**Track 2.8.2 Completed** (26 Jan 2026):
- `src/semantic_scorer.py`: all-MiniLM-L6-v2 embeddings, LRU cache, section matching, safety rails
- Hybrid scoring formula: Lexical 55% + Semantic 35% + Evidence 10%
- ATS report v3.0 with HYBRID SCORING BREAKDOWN and SEMANTIC MATCH ANALYSIS sections
- Graceful degradation when sentence-transformers unavailable

**Key Features**:
- **Section-level matching**: JD Requirements ↔ CV Skills, JD Responsibilities ↔ CV Experience
- **Semantic matching**: Meaning-based similarity (e.g., "cloud computing" matches "AWS")
- **Evidence scoring**: Skills in context (achievements, metrics) score higher than skill lists
- **Embedding safety rails**: Prevent semantic over-matching on vague text
- **Explainability**: Show why the score is what it is (top matches, section similarities)

### **✅ Track 2.9.1: Quick Wins** - COMPLETE (26 Jan 2026)

**Features Implemented:**
- [x] **#90 Match Score Tier Labels**: "Top Match" (85%+), "Good Fit" (60-84%), "Reach" (<60%) badges in all score displays
- [x] **#94 Privacy-First Messaging**: Shield icon + "Your CV never leaves this PC" in footer
- [x] **#92 JD Auto-Save**: Store full JD text in database, "View Original Job Description" button + modal in JobDetail

### **✅ Track 2.9.2–2.9.3: Core UX + CV Refinement** - COMPLETE

- Match Explanation Cards (#89) — "why you match" narrative with section-level evidence
- Gap-fill Wizard (#82) — guided evidence questions per gap type (critical/evidence/semantic)
- Smart CV Gap Analysis with Actionable Suggestions (#87) — placement recommendations
- Auto-Suggest Keywords (#100) — keyword injection into CV via LLM with verification
- CV Versioning System (#98) — full version history + one-click restore
- Pipeline Health Diagnosis (#33) — LLM diagnosis of application funnel bottlenecks
- Evidence Gap Enrichment (#78) — section badges + specific advice per weak-evidence skill

---

### **✅ Track 3.0: CV Coach** - COMPLETE (February 2026)

**Why**: A Grammarly-style live CV quality coach that assesses the CV without a job description — ensuring the document is strong before tailoring begins.

**Features (Idea #229):**
- Live re-assessment on every keystroke (1.5s debounce) — no submit button
- Animated quality score with colour bands and coaching suggestion cards
- Jump-to-section links from each suggestion
- Version history picker — load and restore any stored CV version
- Professional Summary Generator (#55) — two-click LLM generate with optional JD context, PII-scrubbed
- Pull from Profile — injects contact header + experience text from Candidate Profile

**Route**: `/cv-coach` | **Component**: `CvCoach.tsx`

---

### **✅ Track 3.1: Candidate Profile** - COMPLETE (February–March 2026)

A structured data profile that acts as the single source of truth for career history. Assembles CV sections on demand; PII never exposed to LLM in raw form.

**Sub-features delivered:**

| Idea | Feature |
|------|---------|
| #233 | Candidate Profile + PII Privacy Layer — personal info, job history, contact header assembly |
| #238 | Pull from Profile — contact header injected into CV editors with idempotent replace |
| #240 | Certifications + Skills sections — CRUD, reorder, category grouping |
| #242 | Position Profiling — cross-job skill frequency, consistent gaps, strengths, role distribution |
| #243 | Professional Development — 6 types, status badges, promotion-to-Certification flow |
| #281 | Issuing Organisation as first-class entity — colour, display label, logo; cert FK + grouping modes |
| —    | Education section, Professional Summary card, Section Config panel, CV Preview panel |

**Profile page sections:**
- CV Section Order (reorder + eye toggle, persisted as JSON on profile)
- Professional Summary (textarea + AI Generate, PII-scrubbed before LLM)
- Personal Info (name, email, phone, location, LinkedIn, website, headline)
- Issuing Organisations admin (colour picker, logo URL)
- Certifications (org FK, flat/by-issuer grouping, modal CRUD, reorder)
- Professional Development (6 types, promotion flow to Certifications)
- Job History (CRUD, reorder, sync-from-CV via `<!-- JOB:id -->` markers)
- Education (qualification, institution, grade, field of study, year range)
- Skills (chip UI, grouped by category)
- CV Preview (collapsible; assembles all visible sections in configured order)

**Route**: `/profile` | **Component**: `CandidateProfile.tsx`
**Route**: `/position-profile` | **Component**: `PositionProfile.tsx`

---

## ⚠️ **LLM BACKEND CAPABILITY NOTES**

Not all LLM backends are equal across features. This matters for feature recommendations and future work.

### Keyword Injection (`POST /api/jobs/{id}/apply-suggestions`)

This is a **multi-constraint structured editing task**: the model must simultaneously preserve all existing content, insert keywords naturally or into skills sections, avoid fabricating experience, output the complete revised document, and write an accurate changelog. This is hard for small models.

| Backend | Model | Keyword Injection | Notes |
|---------|-------|-------------------|-------|
| Gemini | gemini-2.0-flash | ✅ Reliable | 4/5 keywords verified in testing |
| Ollama | llama3.1:8b | ❌ Unreliable | Returns unchanged CV, fabricates changelog |
| Ollama | larger models | Unknown | Not tested |
| Llama.cpp | gemma-3-27B | Unknown | Not tested |

**Recommendation**: Use Gemini for `apply-suggestions`. The UI has a backend selector — users should choose Gemini for this feature. Local models may work for the initial CV/cover letter generation (simpler task) but fail at in-place editing.

**Why local models fail**: The 8B parameter class is too small for multi-constraint instruction following. The model reads "do not fabricate" and over-applies it, returning the original unchanged. It then generates a plausible-sounding but fabricated changelog. This was discovered via client-side keyword verification (introduced 25 Feb 2026).

### CV/Cover Letter Generation (`POST /api/jobs`)

Local models (Ollama llama3.1:8b, Llama.cpp) work adequately for initial generation. Output quality is lower than Gemini but acceptable for a first draft.

---

## 🛠️ **DEVELOPMENT WORKFLOW**

### **Primary Tool: Claude Code** (as of 19 Jan 2026)

We've adopted Claude Code as the primary development tool for:
- Direct file access (no manual uploads)
- Running commands (pip, npm, tests)
- Project memory via CLAUDE.md

**Use Claude.ai for:**
- Research and exploration
- Strategic planning
- Documentation and diary entries
- Web search

See `PROJECT_DIARY_007.md` for details on this decision.

---

## 🏗️ **CURRENT SYSTEM ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│                     http://localhost:5173                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTP (proxied)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VITE DEV SERVER                             │
│                        Port 5173                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Frontend                        │    │
│  │  - Dashboard (stats, recent apps)                       │    │
│  │  - New Application (file upload, backend selection)     │    │
│  │  - History (search, filter, sort)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ /api/* proxied to :8000
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND                              │
│                        Port 8000                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    REST API                              │    │
│  │  POST /api/jobs      - Create job                       │    │
│  │  GET  /api/jobs/{id} - Get job status                   │    │
│  │  GET  /api/backends  - List LLM backends                │    │
│  │  GET  /api/applications - List past outputs             │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────┐    │
│  │              Background Task Processor                   │    │
│  │  - Runs JobApplicationWorkflow                          │    │
│  │  - Updates progress in JobStore                         │    │
│  │  - Generates CV, Cover Letter, ATS Report               │    │
│  └────────────────────────┬────────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM BACKENDS                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Ollama    │  │  Llama.cpp  │  │   Gemini    │             │
│  │   (Local)   │  │   Server    │  │    API      │             │
│  │  Port 11434 │  │  Port 8080  │  │   (Cloud)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **THREE-TRACK DEVELOPMENT PLAN**

### **Track 1: Professional Outputs** ✅ COMPLETE
- CLI workflow with 6-file outputs
- Professional DOCX generation
- ATS optimization with scoring
- Multi-backend support

### **Track 2: Local Web UI** ✅ COMPLETE (Core Features)

| Week | Focus | Status |
|------|-------|--------|
| Week 1 | FastAPI Backend | ✅ Complete |
| Week 2 | React Frontend | ✅ Complete |
| Week 3 | Polish & WebSockets | ✅ Complete |
| **Track 2.5** | **Outcome Tracking** | **✅ Complete** |

**Core Features Working:**
- WebSocket real-time progress updates
- File preview with markdown rendering
- Error boundaries and skeleton loading
- All three backends tested (Ollama, Llama.cpp, Gemini)
- SQLite persistence for jobs and CVs
- Multiple CV management

**MVP for Validation (Track 2.5):**
- Application outcome tracking (status, dates, notes)
- Success metrics dashboard (funnel, rates)

### **Track 3: SaaS Deployment** 🔮 FUTURE

**When to Start:**
- ✅ Track 2 complete and validated
- ✅ 20+ real applications processed
- ✅ Workflow proven effective
- ✅ UI/UX refined based on use

**Key Changes from Local:**
- User authentication (OAuth2 + JWT)
- Payment integration (Stripe)
- PostgreSQL database (multi-tenant)
- S3 storage for files
- Remove backend selection (we control infrastructure)

---

## 📂 **PROJECT STRUCTURE**

```
job_applications/
├── MASTER_VISION.md                 ← Strategic direction (this file)
├── QUICKSTART.md                    ← How to run the project
├── CLAUDE.md                        ← Claude Code project context (create this)
│
├── docs/
│   ├── journal/                     ← Progress history
│   │   ├── PROJECT_DIARY_001.md     (Multi-backend implementation)
│   │   ├── PROJECT_DIARY_002.md     (Restructure + Web UI planning)
│   │   ├── PROJECT_DIARY_003.md     (Track 1/2/3 planning)
│   │   ├── PROJECT_DIARY_004.md     (Track 1 complete - DOCX)
│   │   ├── PROJECT_DIARY_005.md     (Track 2 Week 1 - Backend)
│   │   ├── PROJECT_DIARY_006.md     (Track 2 Week 2 - Frontend)
│   │   ├── PROJECT_DIARY_007.md     (Claude Code adoption)
│   │   └── PROJECT_DIARY_008.md     (Track 2 Week 3 - WebSocket)
│   │
│   ├── guides/                      ← User documentation
│   │   ├── ATS_OPTIMIZATION_GUIDE.md
│   │   ├── BACKEND_NAMING_GUIDE.md
│   │   └── CV_JSON_QUICKSTART.md
│   │
│   └── architecture/                ← Technical design
│       ├── WEB_ARCHITECTURE.md
│       └── MVP_IMPLEMENTATION_GUIDE.md
│
├── scripts/                         ← CLI entry points
│   └── run_workflow.py
│
├── src/                             ← Core Python modules
│   ├── job_application_workflow.py  (Main workflow)
│   ├── docx_templates.py            (DOCX generation)
│   ├── ats_optimizer.py             (ATS analysis)
│   ├── llm_backend.py               (Multi-backend support)
│   ├── cv_to_json.py                (Profile management)
│   └── generate_output.py           (Output generation)
│
├── backend/                         ← FastAPI REST API (Track 2)
│   ├── main.py                      (API endpoints)
│   ├── job_processor.py             (Background tasks)
│   ├── job_store.py                 (In-memory job tracking)
│   └── test_api.py                  (API tests)
│
├── frontend/                        ← React Web UI (Track 2)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── NewApplication.tsx
│   │   │   ├── ApplicationHistory.tsx
│   │   │   └── JobDetail.tsx        (Job detail with file preview)
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── inputs/                          ← User data
│   ├── davidcv.txt
│   └── job_descriptions/
│
├── outputs/                         ← Generated applications
│   └── [job-name]_[BACKEND]_[timestamp]/
│
├── node_modules/                    ← Node.js dependencies
└── venv/                            ← Python environment
```

---

## 🚀 **HOW TO RUN**

### **Option 1: CLI (Track 1)**
```powershell
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"
.\venv\Scripts\Activate.ps1
python scripts\run_workflow.py --cv inputs\davidcv.txt --job inputs\job_descriptions\test.txt --backend ollama
```

### **Option 2: Web UI (Track 2)**

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

---

## 📊 **SUCCESS METRICS**

### **Track 1 (CLI):** ✅ ACHIEVED
- [x] 6 files generated per job
- [x] DOCX files open in Word
- [x] ATS scores calculated
- [x] Cover letters professional
- [x] Multi-backend support

### **Track 2 (Local Web UI):** ✅ Core Complete, 🔄 Track 2.5 In Progress
- [x] Web app runs on localhost
- [x] File uploads work via drag & drop
- [x] All backends selectable in UI
- [x] Job submission end-to-end working
- [x] Real-time progress displays (WebSocket)
- [x] File preview in browser
- [x] Error boundaries and loading states
- [x] All three backends tested
- [x] SQLite persistence
- [x] Multiple CV management
- [x] **Application outcome tracking** (Track 2.5) - 24 Jan 2026
- [x] **Success metrics dashboard** (Track 2.5) - 24 Jan 2026

### **Track 3 (SaaS):** 🔮 FUTURE
- [ ] 10 beta users testing
- [ ] 100 registered users
- [ ] 20 paying customers

---

## 📅 **DECISION LOG**

### **Major Decisions Made:**

| Date | Decision | Diary |
|------|----------|-------|
| Dec 2024 | Multi-backend architecture | 001 |
| Dec 2024 | Project restructure + 3-track plan | 002-003 |
| Dec 2024 | Track 1 complete with DOCX | 004 |
| Jan 2026 | FastAPI + React tech stack confirmed | 005 |
| Jan 2026 | React frontend complete | 006 |
| Jan 2026 | Adopt Claude Code for development | 007 |
| Jan 2026 | **WebSocket for real-time progress** | 008 |
| Jan 2026 | **Track 2 Complete** - File preview, error handling, all backends | 009 |
| Jan 2026 | SQLite + CV management + UI overhaul | 010 |
| Jan 2026 | **Track 2.5 required** - Outcome tracking before validation | 011 |
| Jan 2026 | **Track 2.6** - Multi-user support with profile selector | 012 |
| Jan 2026 | Job detail view, model column, 41-idea backlog | 012 |
| Jan 2026 | **Track 2.8: Hybrid Semantic ATS** - shift from keyword to embeddings | - |
| Jan 2026 | **Track 2.8.1 Complete** - Section detection, entity extraction, evidence scoring | 015 |
| Jan 2026 | **Track 2.8.2 Complete** - Semantic embeddings, hybrid scoring (55/35/10) | 016 |
| Jan 2026 | **Track 2.9.1 Complete** - Quick Wins: tier labels, privacy footer, JD auto-save | 017 |
| Feb 2026 | **Track 2.9.2–3 Complete** - Match cards, gap-fill wizard, keyword injection, versioning | 018–049 |
| Feb 2026 | **Track 3.0 Complete** - CV Coach: live scoring, summary generator, pull from profile | 050–055 |
| Feb 2026 | **Candidate Profile (#233)** - personal info, job history, PII scrubber, contact header | 056 |
| Feb 2026 | **Certifications + Skills (#240)** - CRUD, reorder, assembler | 057 |
| Feb 2026 | **Position Profiling (#242)** - cross-job skill freq, corpus checkbox | 057 |
| Feb 2026 | **Professional Development (#243)** - 6 types, promotion flow | 058 |
| Feb 2026 | **Issuing Organisations (#281)** - first-class entity, cert FK, flat/by-org grouping | 059 |
| Mar 2026 | **Education + Summary + SectionConfig + Preview** - profile page complete | 060 |

### **Pending Decisions:**
- ~~SQLite vs in-memory for job history?~~ ✅ SQLite implemented
- ~~Multiple CV management?~~ ✅ Implemented
- ~~Profile management in Track 3 or separate phase?~~ ✅ Built as Track 3.1 (local-first)
- ⏳ When to validate and move to Track 3 SaaS? (after 20+ tracked applications with profile data)
- ⏳ Llama.cpp model selection UI (#1 — deferred, low priority)

---

## 🔮 **FUTURE VISION**

### **Phase 1: Job Application Tool** (Tracks 1-3) ← WE ARE HERE
- Upload CV + job description
- Get tailored outputs
- Download DOCX files

### **Phase 2: Profile Management** ✅ LARGELY COMPLETE (Track 3.1)
- ~~Users create one master profile~~ ✅ Candidate Profile built
- ~~Single source of truth~~ ✅ Profile assembles all CV sections on demand
- Generate infinite variations (tech CV, leadership CV, LinkedIn export) — still to build

### **Phase 3: Public Profiles + Matching** (Future)
- Searchable public profiles
- Auto-matching to jobs
- Two-sided marketplace

### **Phase 4: Full Talent Marketplace** (Long-term)
- Company recruiter accounts
- Analytics dashboards
- API for integrations

---

## 🎯 **STRATEGIC PRIORITIES**

### **Current State (March 2026):**
Everything through Track 3.1 is complete. The tool is feature-rich and actively usable for real job applications. The Candidate Profile is the new foundation — all CV assembly flows through it.

### **Next Candidates (all Priority 4, pick based on value):**

| ID | Idea | Why now |
|----|------|---------|
| #34 | STAR Behavioral Coach | Job History is built; natural extension for interview prep |
| #59 | Job title-based bullet suggestions | Position profiling + job history make this feasible now |
| #37 | Answer Reuse Engine | Companion to #34 — reuse STAR stories across applications |
| #35 | Mock AI Interviewer | Larger scope follow-on to #34 |
| #30 | Follow-up Automation | Outcome tracking is in place; this adds chasing cadence |
| #1  | Llama.cpp model selection | Small UI polish, low effort |

### **Medium-term:**
1. Use the tool for real job applications — validate the full profile → assemble → submit → track loop
2. Decide: continue local-only OR scope Track 4 (SaaS/multi-user hosted)

### **Backlog:**
See `ideas.db` for full backlog. Run `python "C:/Users/davidgp2022/My Drive/Kaizen/programme/scripts/ideas/ideas.py" list --project job_applications` or generate the HTML view.

---

## 🎯 **ONE-SENTENCE SUMMARY**

**Track 3.1 complete — the Candidate Profile is the source of truth, the CV assembles from structured data, and the tool is ready for active use. Next: interview prep (#34 STAR Coach) or job title bullet suggestions (#59).**

---

**Last Updated**: 5 March 2026
**Next Review**: After first batch of real applications tracked end-to-end with profile data
**Development Tool**: Claude Code (see PROJECT_DIARY_007.md)

**Status**: ✅ **TRACK 3.1 COMPLETE** - Candidate Profile | 🎯 **NEXT** - Interview Prep / Bullet Suggestions

---

**END OF MASTER VISION**
