# MASTER VISION - Job Application Workflow

**Last Updated**: 23 January 2026
**Current Status**: Track 2 COMPLETE - Ready for Validation
**Next Phase**: Use for real job applications, then decide on Track 3

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

### **Track 2: Local Web UI** ✅ COMPLETE

| Week | Focus | Status |
|------|-------|--------|
| Week 1 | FastAPI Backend | ✅ Complete |
| Week 2 | React Frontend | ✅ Complete |
| Week 3 | Polish & WebSockets | ✅ Complete |

**All Features Working:**
- WebSocket real-time progress updates
- File preview with markdown rendering
- Error boundaries and skeleton loading
- All three backends tested (Ollama, Llama.cpp, Gemini)

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
│   │   │   └── ApplicationHistory.tsx
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

### **Track 2 (Local Web UI):** ✅ COMPLETE
- [x] Web app runs on localhost
- [x] File uploads work via drag & drop
- [x] All backends selectable in UI
- [x] Job submission end-to-end working
- [x] Real-time progress displays (WebSocket)
- [x] File preview in browser
- [x] Error boundaries and loading states
- [x] All three backends tested

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

### **Pending Decisions:**
- ⏳ SQLite vs in-memory for job history?
- ⏳ When to validate and move to Track 3?
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
3. Start using web UI for real job applications

### **Short-term (Next 2-3 Weeks):**
1. Use web UI for 10-20 real job applications
2. Validate workflow effectiveness
3. Track success metrics

### **Medium-term (1-3 Months):**
1. Track success metrics (interviews, offers)
2. Decide: Continue local-only OR proceed to Track 3?
3. If validated: Begin Track 3 planning

### **Deferred Enhancements:**
See `ideas.db` for full backlog (18 ideas). Top priorities:
- Multi-user support with isolated profiles
- Multiple CV management with default selection
- Llama.cpp model selection dropdown
- Wider, info-dense UI layout

---

## 🎯 **ONE-SENTENCE SUMMARY**

**Track 2 is complete: we have a fully functional local web UI (React + FastAPI) with real-time WebSocket updates, file preview, error handling, and all three backends (Ollama, Llama.cpp, Gemini) tested; next step is validation with real job applications.**

---

**Last Updated**: 23 January 2026
**Next Review**: After 10-20 real applications processed
**Development Tool**: Claude Code (see PROJECT_DIARY_007.md)

**Status**: 🟢 **TRACK 2 COMPLETE** - Ready for validation phase

---

**END OF MASTER VISION**
