# PROJECT DIARY 010 - Phase 1 Infrastructure & UI Overhaul

**Date**: 23 January 2026
**Focus**: SQLite persistence, CV management, professional UI redesign
**Status**: Complete

---

## Summary

Implemented foundational infrastructure improvements and a complete UI overhaul to make the application more professional and information-dense before entering the validation phase.

---

## Completed Tasks

### 1. SQLite Persistence for Job History

**Problem**: Jobs were stored in-memory, lost on server restart.

**Solution**: Created `backend/job_store.py` with SQLite-backed storage.

**Files Changed**:
- `backend/job_store.py` (NEW) - SQLite job store with `JobStore` and `CVStore` classes
- `backend/main.py` - Import from new module

**Database**: `jobs.db` in project root with tables:
- `jobs` - Job processing status and metadata
- `cvs` - Stored CVs for reuse

### 2. Multiple CV Management

**Problem**: Users had to re-upload CV for every application.

**Solution**: CVs can now be saved, named, and reused.

**Features**:
- Save uploaded CV with custom name
- Set default CV (auto-selected)
- Delete stored CVs
- Select from dropdown or upload new

**API Endpoints Added**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cvs` | List stored CVs |
| POST | `/api/cvs` | Upload and save CV |
| GET | `/api/cvs/{id}` | Get CV with content |
| DELETE | `/api/cvs/{id}` | Delete CV |
| PUT | `/api/cvs/{id}/default` | Set as default |

**Files Changed**:
- `backend/job_store.py` - Added `CVStore` class
- `backend/main.py` - Added CV endpoints, updated job creation to accept `cv_id`
- `frontend/src/types.ts` - Added `StoredCV` type
- `frontend/src/api.ts` - Added CV API functions
- `frontend/src/components/NewApplication.tsx` - Added CV selector UI

### 3. Professional UI Overhaul

**Problem**: UI was too playful/childish with rounded corners, soft colors, excessive padding, and wasted space.

**Solution**: Complete redesign with sharp, professional, information-dense styling.

**Design Principles**:
- Sharp corners (no pill shapes)
- Solid borders instead of dashed
- Slate color palette (neutral, professional)
- Dark header bar
- Tight spacing, minimal padding
- Data tables instead of cards
- Monospace fonts for numbers/dates
- Uppercase labels with tracking

**Before**: Rounded cards, purple gradients, playful styling
**After**: Sharp tables, dark header, compact data-dense layout

**Files Changed**:
- `frontend/src/App.tsx` - Dark header, tighter layout
- `frontend/src/components/Dashboard.tsx` - Stats row, data table
- `frontend/src/components/ApplicationHistory.tsx` - Compact table with inline filters
- `frontend/src/components/NewApplication.tsx` - Two-column form, inline settings

---

## Technical Details

### SQLite Schema

```sql
-- Jobs table
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    current_step TEXT,
    message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    output_dir TEXT,
    ats_score REAL,
    files TEXT,  -- JSON array
    error TEXT,
    cv_path TEXT,
    job_desc_path TEXT,
    company_name TEXT,
    backend_type TEXT
);

-- CVs table
CREATE TABLE cvs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### UI Component Changes

| Component | Old Style | New Style |
|-----------|-----------|-----------|
| Header | White, rounded logo, indigo accent | Dark slate, sharp, minimal |
| Stats | Large rounded cards | Compact inline boxes |
| Tables | Card-based rows | Data table with headers |
| Buttons | Rounded-lg, pill shapes | Sharp corners, no radius |
| Colors | Indigo/purple playful | Slate/gray professional |
| Spacing | Generous padding | Tight, information-dense |

---

## Ideas Database Updates

Marked as complete in `ideas.db`:
- #2 SQLite for job history - **Done**
- #16 Multiple CV management - **Done**
- #18 Wider UI layout - **Done**

---

## Screenshots

Located in `C:\Users\davidgp2022\My Drive\Downloads\`:
- `Job-Application-Workflow-01-23-2026_03_28_PM.png` - Final dashboard

---

## Next Steps

1. **Validation Phase**: Use web UI for 10-20 real job applications
2. **Phase 3** (when ready): Llama.cpp model selection + application templates
3. **Track 3** (future): SaaS deployment if validation successful

---

## Lessons Learned

1. **UI Design**: Rounded corners and soft colors look playful; sharp corners and neutral colors look professional
2. **Data Density**: Tables with headers are more scannable than card layouts for lists
3. **SQLite**: Simple solution for persistence without external dependencies

---

**Time Spent**: ~3 hours
**Lines Changed**: ~800+ (new files + rewrites)
**Development Tool**: Claude Code

---

**END OF DIARY ENTRY 010**
