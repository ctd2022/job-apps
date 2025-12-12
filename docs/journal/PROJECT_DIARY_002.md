# Project Diary - Entry 002: Project Restructuring & Web Interface Planning

**Date**: 12 December 2025, 09:00-10:30 GMT  
**LLM Used**: Claude Sonnet 4.5 (via claude.ai)  
**Status**: Project Reorganized - Ready for Web UI Development  
**Achievement**: Clean file structure + Web interface architecture designed

---

## What We Did Today

### 1. Project Restructuring

**Problem**: Messy root directory with v1/v2 files mixed together, no clear documentation structure

**Solution**: Comprehensive reorganization into clean folder hierarchy

#### New Structure
```
job_applications/
├── archive/v1/          # Old versions safely stored
│   ├── run_workflow.py
│   ├── job_application_workflow.py
│   └── ats_optimizer.py
│
├── docs/                # All documentation centralized
│   ├── guides/          # User-facing guides
│   │   ├── QuickStart_Guide_v2.html
│   │   └── HowToRun.html
│   ├── architecture/    # Technical design documents
│   │   ├── WEB_ARCHITECTURE.md
│   │   ├── MVP_IMPLEMENTATION_GUIDE.md
│   │   └── QuickStart_Guide_v2.html
│   └── journal/         # Progress diary entries
│       ├── PROJECT_DIARY_001.md (04 Dec - Multi-backend)
│       └── PROJECT_DIARY_002.md (12 Dec - Restructure + Web planning)
│
├── src/                 # Core Python modules (current versions)
│   ├── llm_backend.py
│   ├── ats_optimizer.py          (was ats_optimizer_v2.py)
│   ├── job_application_workflow.py (was job_application_workflow_v2.py)
│   ├── cv_to_json.py
│   └── generate_output.py
│
├── scripts/             # CLI entry points
│   ├── run_workflow.py  (was run_workflow_v2.py)
│   └── test_enhanced_stopwords.py
│
├── inputs/              # User data (CVs, job descriptions)
├── outputs/             # Generated applications
└── venv/                # Python virtual environment
```

#### Migration Process
1. Created folder structure (docs/, archive/, src/, scripts/)
2. Moved old v1 files to archive/v1/
3. Moved current v2 files to src/ and scripts/
4. Renamed files (dropped "_v2" suffix - these are now current)
5. Moved all .md/.html docs to docs/ subfolders
6. Updated import paths in Python files

#### Path Issues Resolved
**Challenge**: Import errors after moving files

**Fixes Applied**:
- Added `sys.path.insert(0, str(Path(__file__).parent.parent / "src"))` to scripts
- Updated imports from `ats_optimizer_v2` → `ats_optimizer`
- Updated imports from `job_application_workflow_v2` → `job_application_workflow`

**Files Modified**:
- `scripts/run_workflow.py` - Added path handling + updated imports
- `scripts/test_enhanced_stopwords.py` - Added path handling
- `src/job_application_workflow.py` - Updated import from v2 to current
- `src/ats_optimizer.py` - No changes needed (imports already correct)

---

### 2. Testing & Validation

#### Test Run 1: Google DeepMind Role (qwen2.5:32b)
**Command**:
```bash
python .\scripts\run_workflow.py `
  --cv .\inputs\davidcv.txt `
  --job .\inputs\job_descriptions\google-deepmind.txt `
  --company "Citi" `  # Note: Wrong company (intentional for first test)
  --backend ollama `
  --ollama-model qwen2.5:32b
```

**Results**:
- âœ… All imports resolved successfully
- âœ… Files generated in correct structure
- âœ… Backend tagging working (`google-deepmind_OLLAMA_20251212_091838/`)
- âš ï¸ ATS Score: 56.7% (low - expected for AI/prototyping role vs banking CV)
- âš ï¸ Company name mismatch discovered (used "Citi" for Google DeepMind job)
- ðŸ•' Processing time: ~7-8 minutes

**Key Insight**: Company name filtering worked correctly (excluded "Citi") but revealed we need correct company for accurate analysis

#### Test Run 2: Switching to Faster Model
**Discovery**: Need faster model for testing iterations

**Available Models**:
```
phi3:mini          2.2 GB   (smallest)
llama3.2:3b        2.0 GB   (âœ… chosen for testing)
llama3.1:8b        4.9 GB   (good balance)
qwen2.5:14b        9.0 GB   (mid-tier)
qwen2.5:32b       19 GB     (best quality, production use)
```

**Recommendation**: Use `llama3.2:3b` for rapid testing (2-3 min vs 7-8 min)

#### Test Run 3: Path Issues
**Challenge**: Hit `ModuleNotFoundError` when switching models
**Root Cause**: Virtual environment deactivated between runs
**Solution**: Reactivated venv with `.\venv\Scripts\Activate.ps1`
**Lesson**: Always verify `(venv)` in prompt before running

---

### 3. Web Interface Architecture Designed

#### Vision: Two Distinct Projects

**Project A: Local Web Interface** (Build First - Next 2-3 Weeks)
- Purpose: Replace CLI with polished web UI for personal use
- Deployment: localhost only
- Authentication: None needed (single user)
- Storage: File system + SQLite
- Backend Selection: Full control (Ollama/Gemini/Llama.cpp)
- Goal: Perfect the workflow and UX

**Project B: SaaS Version** (Future - Fork After Validation)
- Purpose: Commercialize the service
- Deployment: Cloud (Vercel + Railway/Render)
- Authentication: OAuth2 + JWT
- Storage: PostgreSQL + S3
- Backend Selection: Hidden from users (we choose)
- Goal: Monetization

**Strategy**: Build A first, validate with real use, then fork to B when proven

---

### 4. Technical Architecture Planned

#### Frontend Stack
- **React 18** + TypeScript
- **Vite** for build tooling (fast hot reload)
- **TailwindCSS** for styling
- **React Query** for server state
- **React Router** for navigation

#### Backend Stack
- **FastAPI** (Python) - async, modern
- **SQLAlchemy** for database ORM
- **Celery** for background tasks (long-running LLM jobs)
- **Redis** for task queue + caching
- **WebSockets** for real-time status updates

#### Integration Layer
- Reuse existing Python modules:
  - `src/llm_backend.py` - Already multi-backend ready
  - `src/ats_optimizer.py` - ATS analysis engine
  - `src/job_application_workflow.py` - Core workflow
- Add FastAPI wrappers around existing functions
- No rewriting needed - just API layer on top

#### Key Features Planned
1. **Dashboard** - View all applications, ATS scores, history
2. **New Application Form** - Drag & drop file upload
3. **Backend Selection** - Choose Ollama/Gemini/Llama.cpp
4. **Real-time Progress** - WebSocket updates during processing
5. **Results Viewer** - Preview/download CV, cover letter, ATS report
6. **Comparison View** - Compare multiple versions side-by-side
7. **Settings** - Configure backends, API keys, preferences

---

### 5. Documentation Delivered

#### Architecture Documents (in `docs/architecture/`)
1. **WEB_ARCHITECTURE.md** (12K)
   - Complete system design
   - Database schemas
   - Three deployment paths (Local → LAN → SaaS)
   - Technology rationale
   - Security considerations
   - Cost projections

2. **MVP_IMPLEMENTATION_GUIDE.md** (18K)
   - 4-day build plan with actual code
   - Day 1: Backend API (FastAPI)
   - Day 2: Frontend foundation (React)
   - Day 3: Integration & real-time updates
   - Day 4: Polish & testing
   - Deployment options (Local/Docker/Cloud)

3. **web_interface_prototype.html** (Interactive Demo)
   - Full React prototype showing UI
   - Dashboard with stats and application list
   - New application form with file upload
   - Backend selection interface
   - Settings configuration
   - **Open in browser to see the actual UI**

#### Updated Quick Start Guide
- **QuickStart_Guide_v2.html** - Updated with current file structure

---

## Testing Results Summary

### File Structure Migration
- âœ… Old files archived safely
- âœ… Current files renamed (v2 suffix removed)
- âœ… Import paths fixed
- âœ… Documentation reorganized
- âœ… Zero breaking changes

### Workflow Validation
- âœ… CLI still works after restructuring
- âœ… Multi-backend support preserved
- âœ… ATS optimization functional
- âœ… Output structure correct
- âœ… Company name filtering working

### Performance Baseline
| Model | Size | Processing Time | Use Case |
|-------|------|----------------|----------|
| qwen2.5:32b | 19GB | 7-8 minutes | Production (best quality) |
| llama3.2:3b | 2.0GB | 2-3 minutes | Testing (fast iteration) |

---

## Key Decisions Today

### âœ… Project Structure Reorganization
**Decision**: Clean separation of current code, archives, and docs
**Rationale**: Easier maintenance, clearer what's current vs historical
**Trade-off**: One-time migration effort for long-term clarity

### âœ… Drop "_v2" Suffix from Current Files
**Decision**: Current versions have clean names, old ones go to archive
**Rationale**: Version control via git + archive folder, not file names
**Trade-off**: Migration complexity but cleaner codebase

### âœ… Build Local Web UI First, SaaS Later
**Decision**: Two-phase approach rather than cloud-first
**Rationale**: 
  - Validate workflow with personal use first
  - Avoid premature optimization for scale
  - Keep full control and privacy initially
  - Prove concept before investing in infrastructure
**Trade-off**: Delayed monetization but higher quality product

### âœ… Keep Multi-Backend in Local UI
**Decision**: Local version keeps full backend selection
**Rationale**:
  - Personal use needs flexibility
  - Can test/compare different backends
  - Easy to remove later for SaaS version
**Trade-off**: More complex UI but essential for personal workflow

### âœ… FastAPI + React for Web Stack
**Decision**: Modern Python backend + modern JS frontend
**Rationale**:
  - FastAPI integrates easily with existing Python code
  - React gives professional, responsive UI
  - Both have great tooling and documentation
  - Easy path from local to cloud deployment
**Trade-off**: More tech to learn but industry standard

---

## Lessons Learned

### 1. File Structure Matters
- Clean organization = easier development
- Archive strategy prevents "just in case" clutter
- Document folders prevent .md files scattered everywhere
**Takeaway**: Invest time in structure early

### 2. Path Management is Tricky
- Reorganization always causes import issues
- `sys.path` manipulation needed for scripts outside package
- Virtual environment can deactivate unexpectedly
**Takeaway**: Test thoroughly after moves

### 3. Model Selection Impacts Workflow
- qwen2.5:32b = production quality but slow for testing
- llama3.2:3b = fast testing but lower quality
- Different models for different purposes
**Takeaway**: Have testing and production models

### 4. Local-First is Smart
- Build for yourself first
- Prove the concept works
- Then consider commercialization
**Takeaway**: Don't skip the validation phase

### 5. Reuse Over Rewrite
- Existing Python code is solid
- Just need API wrapper, not rewrite
- Backend abstraction already supports multi-backend
**Takeaway**: Architecture decisions from Day 1 paying off

---

## Known Issues

### 1. Virtual Environment Management
**Issue**: Easy to forget to activate venv
**Impact**: Import errors that look like missing files
**Workaround**: Always check prompt for `(venv)`
**Fix Needed**: Add activation reminder to README

### 2. Model Switching Context
**Issue**: When switching models, sometimes venv deactivates
**Impact**: Confusing errors
**Workaround**: Reactivate venv between runs
**Fix Needed**: Investigate why this happens

### 3. Company Name Accuracy
**Issue**: Easy to use wrong company name in CLI
**Impact**: Inaccurate ATS keyword filtering
**Workaround**: Double-check company name in command
**Fix Needed**: Web UI will make this more obvious

---

## Next Steps - Immediate (Next Session)

### Phase 1: Performance Monitoring (Priority 1)
**Goal**: Understand resource usage during processing

**Metrics to Track**:
- âœ… Processing time per step (keyword extraction, CV generation, cover letter, ATS analysis)
- âœ… RAM usage (before, during, after)
- âœ… GPU utilization %
- âœ… VRAM usage (allocated/free)
- âœ… CPU usage %
- âœ… Disk I/O (file read/write operations)

**Implementation**:
```python
# Add to workflow
import psutil
import GPUtil
from datetime import datetime

class PerformanceMonitor:
    def __init__(self):
        self.metrics = {
            'steps': [],
            'system': {
                'ram_total_gb': psutil.virtual_memory().total / (1024**3),
                'gpu_name': GPUtil.getGPUs()[0].name if GPUtil.getGPUs() else None,
                'vram_total_gb': GPUtil.getGPUs()[0].memoryTotal / 1024 if GPUtil.getGPUs() else None
            }
        }
    
    def start_step(self, step_name):
        # Record start time + resource snapshot
        
    def end_step(self, step_name):
        # Record end time + resource delta
        
    def save_report(self, output_dir):
        # Save performance_metrics.json
```

**Output Format**:
```json
{
  "system": {
    "ram_total_gb": 32,
    "gpu_name": "NVIDIA RTX 4060 Ti",
    "vram_total_gb": 16
  },
  "steps": [
    {
      "name": "keyword_extraction",
      "duration_seconds": 45.2,
      "ram_used_gb": 2.1,
      "vram_used_gb": 8.4,
      "gpu_utilization_pct": 78,
      "cpu_utilization_pct": 25
    },
    {
      "name": "cv_generation",
      "duration_seconds": 312.5,
      "ram_used_gb": 2.8,
      "vram_used_gb": 14.2,
      "gpu_utilization_pct": 95,
      "cpu_utilization_pct": 18
    }
  ],
  "total_duration_seconds": 468.3,
  "peak_ram_gb": 3.2,
  "peak_vram_gb": 15.1
}
```

**Dependencies Needed**:
```bash
pip install psutil gputil
```

---

### Phase 2: Web Interface MVP (Weeks 1-2)

#### Week 1: Backend Foundation
**Day 1-2: FastAPI Setup**
- Create `backend/` folder structure
- Set up FastAPI with basic endpoints
- Add CORS for localhost development
- Create file upload endpoints
- Test with Postman/curl

**Day 3-4: Workflow Integration**
- Add background task processing with Celery
- Integrate existing workflow code
- Add WebSocket for real-time updates
- Test end-to-end processing

**Day 5: File Management**
- File storage strategy (local filesystem)
- Output file serving endpoints
- Cleanup old files mechanism

#### Week 2: Frontend Foundation
**Day 1-2: React Setup**
- Create `frontend/` with Vite + React + TypeScript
- Set up TailwindCSS
- Create basic layout and routing
- Mock API client

**Day 3-4: Core UI Components**
- Dashboard view (list applications)
- New application form
- Backend selection component
- File upload with drag & drop

**Day 5: Integration & Testing**
- Connect frontend to backend API
- Real-time status updates
- Download generated files
- End-to-end testing

**Deliverable**: Working localhost web application that replaces CLI

---

### Phase 3: Enhanced Features (Week 3)

**Features to Add**:
1. **Application History** - Search, filter, sort past applications
2. **Comparison View** - Side-by-side comparison of multiple versions
3. **Performance Dashboard** - Visualize metrics from Phase 1
4. **Settings Persistence** - Save backend preferences
5. **Export Functionality** - Bulk download, CSV reports

---

## Future Vision - SaaS Deployment (Post-Validation)

### When to Fork to SaaS
**Criteria**:
- âœ… Local version used for 20+ real applications
- âœ… Workflow proven effective (track success rate)
- âœ… UI/UX refined based on personal use
- âœ… Performance metrics optimized
- âœ… No major feature gaps identified

**Estimated Timeline**: 6-8 weeks of personal use

### SaaS Changes Required
**Remove**:
- Backend selection UI (we choose infrastructure)
- API key configuration (we manage keys)
- Local file storage (move to S3/GCS)

**Add**:
- User authentication (OAuth2 + JWT)
- Payment integration (Stripe)
- Usage limits per tier (free/pro/enterprise)
- User database (PostgreSQL)
- Email notifications
- Admin dashboard

### Business Model
**Free Tier**:
- 5 applications/month
- Gemini API backend
- Basic ATS analysis
- 30-day data retention

**Pro Tier ($19/month)**:
- 50 applications/month
- All backend options
- Advanced ATS analysis
- 1-year data retention
- Priority processing

**Enterprise (Custom)**:
- Unlimited applications
- Dedicated resources
- Custom integrations
- White-label option

### Cost Projections
**Initial (0-100 users)**:
- Hosting: $30-50/month (Railway + Vercel)
- Database: $15/month (managed PostgreSQL)
- Storage: $5/month (S3)
- **Total**: ~$50-70/month

**Scale (1000 users)**:
- Compute: $200/month (auto-scaling)
- Database: $50/month
- Storage: $20/month
- CDN: $10/month
- **Total**: ~$280/month

**Revenue Potential (1000 users, 20% conversion)**:
- 200 Pro users Ã— $19 = $3,800/month
- Costs: $280/month
- **Net**: ~$3,500/month

---

## Success Metrics

### Today's Session
- [x] Project structure reorganized
- [x] Import paths fixed and tested
- [x] CLI working with new structure
- [x] Web architecture designed
- [x] MVP implementation guide created
- [x] UI prototype delivered
- [x] Next steps clearly defined

**Status**: âœ… **ALL OBJECTIVES ACHIEVED**

### Next Session Goals
- [ ] Add performance monitoring (RAM/CPU/GPU/VRAM)
- [ ] Track processing time per step
- [ ] Generate performance reports
- [ ] Begin FastAPI backend setup
- [ ] Create basic React frontend

---

## Quote of the Day

> "Reorganization is not procrastination - it's preparation for acceleration."

---

## File Manifest

### Created Today
| File | Size | Location |
|------|------|----------|
| WEB_ARCHITECTURE.md | 12K | docs/architecture/ |
| MVP_IMPLEMENTATION_GUIDE.md | 18K | docs/architecture/ |
| web_interface_prototype.html | 28K | docs/architecture/ |
| PROJECT_DIARY_002.md | 15K | docs/journal/ |

### Modified Today
| File | Change | Location |
|------|--------|----------|
| run_workflow.py | Added path handling, updated imports | scripts/ |
| test_enhanced_stopwords.py | Added path handling | scripts/ |
| job_application_workflow.py | Updated import from v2 | src/ |

### Moved Today
| From | To |
|------|-----|
| Root/*.md | docs/guides/ or docs/architecture/ |
| Root/*_v2.py | src/*.py (renamed, dropped v2) |
| Root/run_workflow_v2.py | scripts/run_workflow.py |
| Old versions | archive/v1/ |

---

## Summary

### What We Did
âœ… Reorganized project structure (archive, docs, src, scripts)  
âœ… Fixed all import paths after migration  
âœ… Tested end-to-end with qwen2.5:32b (production quality)  
âœ… Identified llama3.2:3b as fast testing model  
âœ… Designed complete web interface architecture  
âœ… Created MVP implementation guide (4-day plan)  
âœ… Built interactive UI prototype (open in browser)  
âœ… Defined two-phase strategy (Local → SaaS)  

### What We Learned
ðŸŽ¯ Clean structure = easier maintenance  
ðŸŽ¯ Path issues are inevitable but fixable  
ðŸŽ¯ Model selection impacts testing speed  
ðŸŽ¯ Local-first approach reduces risk  
ðŸŽ¯ Existing code architecture supports web UI  

### What's Next
**Immediate** (Next Session):
- Add performance monitoring (RAM/CPU/GPU/VRAM tracking)
- Record step-by-step processing times
- Begin web interface development

**Short-term** (2-3 Weeks):
- Build localhost web UI
- Replace CLI with browser interface
- Keep multi-backend support for personal use

**Long-term** (2-3 Months):
- Validate workflow with 20+ real applications
- Track success metrics
- Fork to SaaS version if proven effective

**Stretch Goal**:
- Launch as commercial service
- Estimated $3,500/month net at 1000 users

---

**Time Investment Today**: 1.5 hours  
**Value Delivered**: Clean codebase + Clear roadmap + Ready to build  
**Next Session**: Performance monitoring + Web UI kickoff  

**Status**: âœ… **READY FOR WEB DEVELOPMENT PHASE**

---

**End of Entry 002**
