# Project Diary — Entry 058

**Date**: 2026-02-28
**Ideas**: #243 — Professional Development section
**Status**: Done

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Implemented Idea #243 — Professional Development section on Candidate Profile. Full CRUD + reorder, type-aware modal, promotion flow to Certifications, CV assembly. Commit `e6d158d`.
- **Next steps**: No specific next task — check ideas backlog
- **Blocked/broken**: Port 8000 has ghost sockets from a zombie uvicorn session. Backend is currently running on port 8001; Vite proxy updated to match. Restart PC to clear or keep using 8001.
- **Ideas backlog**: #242 Phase 2 (LLM narrative on Roles page) low priority; STAR Coach (#34), Mock Interviewer (#35) still in Idea state

---

## What Was Built

### Idea #243 — Professional Development Section

A new section on the Candidate Profile page that tracks in-progress and completed learning activities. Broader than "CPD" — covers anything showing continuous growth across six activity types.

**Six types**: Certification · Course / Training · Degree / Qualification · Professional Membership · Conference / Event · Self-directed

**Key behaviours**:
- Professional Membership is permanently locked to status "Ongoing"
- Target Completion field hidden when status = Completed or type = Membership
- Completed Date shown only when status = Completed
- "Leads to credential" checkbox (Certification/Course types only) reveals a Credential URL field
- Items with `show_on_cv=false` appear at 50% opacity in the list; hidden from CV output
- Colour-coded type badges: blue=Cert, green=Course, indigo=Degree, purple=Membership, amber=Event, slate=Self-directed

**Promotion flow**: when editing a Certification-type item to status=Completed with `leads_to_credential=true`, the user is prompted "Add this to your Certifications section?" — one click auto-creates the Certification record (pre-populated with title, provider, completed date, credential URL). The PD item is kept as a historical record.

**CV assembly**: `assemble_professional_development_section()` renders only `show_on_cv=true` items with type-specific date formatting:
- Membership → `Title | Provider | Ongoing`
- In-progress Cert/Course → `Title | Provider | In Progress (expected: YYYY-MM)` (date optional)
- Completed → `Title | Provider | Completed: YYYY-MM`
- Event → `Title | Provider | start_date`
- Others → `Title | Provider | status`

`GET /api/profile/assemble-cv` now returns a `professional_development_text` key alongside the existing four.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/job_store.py` | New `professional_development` table in `init_db()`; `_row_to_pd()` (bool coercion); `list/create/update/delete/reorder_professional_development()` on `ProfileStore` |
| `backend/main.py` | `ProfessionalDevelopmentCreate` / `ProfessionalDevelopmentUpdate` Pydantic models; 5 REST endpoints; `assemble-cv` returns `professional_development_text` |
| `backend/cv_assembler.py` | `assemble_professional_development_section()` |
| `frontend/src/types.ts` | `PDType`, `PDStatus`, `ProfessionalDevelopment` interface, `ProfessionalDevelopmentCreate/Update` aliases |
| `frontend/src/api.ts` | `list/create/update/delete/reorderProfessionalDevelopment()` |
| `frontend/src/components/CandidateProfile.tsx` | `PDFormState`, `EMPTY_PD_FORM`, `pdToForm()`, `formToPDCreate()`, `PDModal`, `ProfessionalDevelopmentSection`; integrated into main component load + layout |

**Commits**: `e6d158d` (feature), docs commit (this entry)

---

## Debugging Note — Windows Ghost Sockets

After editing the backend, the old uvicorn process (PID 13884) could not be killed from Git Bash because bash translates `/PID` to `C:/Program Files/Git/PID`. Always use Python `subprocess` to call `taskkill`:

```python
subprocess.run(['taskkill', '/F', '/PID', str(pid)], ...)
```

In this session, two ghost PIDs (13884, 10644) held port 8000 with no matching process — sockets orphaned by terminated workers. Workaround: started backend on port 8001 and updated `vite.config.ts` proxy target. Will self-resolve on next system restart.
