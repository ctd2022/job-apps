# MASTER VISION - Job Application Workflow

**Last Updated**: 26 January 2026
**Current Status**: Track 2.9.1 COMPLETE - Quick Wins
**Branch**: `track2.8-semantic-ats`
**Next Phase**: Track 2.9.2 Core UX - Match Explanation Cards

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

### **🎯 Track 2.9.2: Core UX** ← NEXT

**Why This Matters**: Track 2.8 built powerful backend intelligence (semantic scoring, gap analysis, section matching). Track 2.9 surfaces this to users in intuitive, actionable ways. Based on comprehensive competitor UX research (LinkedIn, Otta, Wellfound, Hired, etc.) - see `docs/raw/competitors-ux/`.

**Core Insight from Research**: The shift from "Search & Filter" (user does work) to "Match & Explain" (AI does work, explains why).

**Implementation Phases (Prioritized)**:

| Phase | Idea | Title | Complexity | Impact | Status |
|-------|------|-------|------------|--------|--------|
| **Quick Wins** |
| 2.9.1 | #90 | Match Score Tier Labels | Low | Medium | **DONE** |
| 2.9.1 | #94 | Privacy-First UX Messaging | Low | Medium | **DONE** |
| 2.9.1 | #92 | Job Description Auto-Save | Low | Medium | **DONE** |
| **Core UX** |
| 2.9.2 | #89 | Match Explanation Cards (Otta/Wellfound style) | Medium | High | Next |
| 2.9.2 | #96 | Missing Keywords Alert with Frequency | Medium | High | |
| 2.9.2 | #97 | CV Section Completeness Meter | Medium | Medium | |
| **Evidence Enhancement** |
| 2.9.3 | #93 | Guided Evidence Question (Otta pattern) | Medium | High | |
| **Major Features** |
| 2.9.4 | #91 | Kanban Application Tracker Dashboard | High | High | |
| 2.9.4 | #95 | Parser + Verify Editable Fields (Indeed pattern) | High | High | |

**Key UX Patterns to Adopt** (from research):
- **From Otta**: Match explanation narratives, guided pitch questions, salary transparency
- **From Wellfound**: One-click actions, equity/compensation display
- **From LinkedIn**: Network signals, Easy Apply simplicity, skills assessments
- **From Teal/Huntr**: Comprehensive tracking dashboards, browser extensions

**Patterns to Avoid**:
- Black hole applications with no status feedback
- Opaque matching with no explanation
- Frictionless apply that generates low-quality applications
- Character limits without real-time feedback

**Privacy Differentiator**: "Your CV never leaves this PC" - key advantage vs cloud platforms.

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

### **Pending Decisions:**
- ~~SQLite vs in-memory for job history?~~ ✅ SQLite implemented (23 Jan)
- ~~Multiple CV management?~~ ✅ Implemented (23 Jan)
- ⏳ When to validate and move to Track 3? (after 20+ tracked applications)
- ⏳ Profile management in Track 3 or separate phase?
- ⏳ Llama.cpp model selection UI (deferred enhancement)

---

## 🔮 **FUTURE VISION**

### **Phase 1: Job Application Tool** (Tracks 1-3) ← WE ARE HERE
- Upload CV + job description
- Get tailored outputs
- Download DOCX files

### **Phase 2: Profile Management** (After Track 3)
- Users create one master profile
- Generate infinite variations (tech CV, leadership CV, LinkedIn, etc.)
- Single source of truth

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

### **Immediate (This Week):**
1. ~~Complete Track 2 Week 3~~ ✅ DONE
2. ~~Test with all three backends~~ ✅ DONE
3. ~~Implement Track 2.5: Outcome Tracking~~ ✅ DONE (24 Jan 2026)
4. ~~**Track 2.8: Hybrid Semantic ATS**~~ ✅ Track 2.8.2 COMPLETE (26 Jan 2026)
   - ~~Phase 2.8.1: Section detection + entity extraction~~ ✅ DONE
   - ~~Phase 2.8.2: Semantic embeddings + hybrid scoring~~ ✅ DONE
   - Phase 2.8.3: Constraint penalties (optional, deferred)
5. ~~**Track 2.9.1: Quick Wins**~~ ✅ COMPLETE (26 Jan 2026)
   - ~~#90 Match Score Tier Labels~~ ✅ DONE
   - ~~#94 Privacy-First Messaging~~ ✅ DONE
   - ~~#92 JD Auto-Save~~ ✅ DONE
6. **Track 2.9.2: Core UX** ← NEXT FOCUS
   - #89 Match Explanation Cards ← START HERE
   - #96 Missing Keywords Alert
   - #97 CV Completeness Meter

### **Short-term (Next 2-3 Weeks):**
1. Complete Track 2.9.1 Quick Wins (tier labels, privacy messaging, JD save)
2. Implement Match Explanation Cards (#89) - flagship UX feature
3. Start using for real job applications with new UX

### **Medium-term (1-3 Months):**
1. Complete Track 2.9 UX features
2. Use web UI for 10-20 real job applications
3. Track outcomes and validate improvement
4. Decide: Continue local-only OR proceed to Track 3?

### **Deferred Enhancements:**
See `ideas.db` for full backlog (**50+ ideas**). Run `python scripts/ideas_html.py` for interactive view.

**Track 2.9 UX Ideas** (from competitor research):
- #89 Match Explanation Cards (P5) - "why you match" narrative
- #90 Match Score Tier Labels (P4) - Top Match/Good Fit/Reach
- #91 Kanban Application Tracker (P3) - visual pipeline
- #92 JD Auto-Save (P4) - preserve job postings
- #93 Guided Evidence Question (P4) - Otta-style contextual input
- #94 Privacy-First Messaging (P3) - differentiator
- #95 Parser + Verify Fields (P3) - Indeed pattern
- #96 Missing Keywords Alert (P4) - actionable gaps
- #97 CV Completeness Meter (P3) - quality indicators

**Other High-Priority Ideas**:
- Pipeline Health Diagnosis (P5) - identify bottlenecks in job search
- Mock AI Interviewer (P4) - practice with AI feedback
- JD Red-flag Detector (P4) - flag problematic job descriptions

---

## 🎯 **ONE-SENTENCE SUMMARY**

**Track 2.9.1 complete (tier labels, privacy footer, JD viewer). Next: Track 2.9.2 Core UX - match explanation cards to show users WHY they match.**

---

**Last Updated**: 26 January 2026
**Next Review**: After Track 2.9.2 Core UX complete
**Development Tool**: Claude Code (see PROJECT_DIARY_007.md)

**Status**: ✅ **TRACK 2.9.1 COMPLETE** - Quick Wins | 🎯 **TRACK 2.9.2 NEXT** - Core UX

---

**END OF MASTER VISION**
