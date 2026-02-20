# PROJECT DIARY 012 - Track 2.6: Multi-User Support

**Date**: 25 January 2026
**Focus**: Lightweight multi-user profile selector (no auth)
**Status**: Complete

---

## Summary

Implemented multi-user support to enable 2-person validation testing and lay the foundation for future scaling. Each user gets isolated jobs, CVs, and metrics.

---

## Features Implemented

### 1. Database Schema Changes

**File**: `backend/job_store.py`

Added new `users` table:
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
)
```

Added `user_id` column to existing tables:
- `jobs` table: `user_id TEXT`
- `cvs` table: `user_id TEXT`

Added indexes:
- `idx_jobs_user_id`
- `idx_cvs_user_id`

Migration strategy:
- Columns added via `ALTER TABLE` (idempotent)
- Default user created automatically (id='default', name='Default User')
- Existing data migrated to default user

### 2. New UserStore Class

**File**: `backend/job_store.py`

```python
class UserStore:
    def create_user(self, name: str) -> Dict[str, Any]
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]
    def list_users(self) -> List[Dict[str, Any]]
```

### 3. Updated Store Methods

All `JobStore` and `CVStore` methods updated with optional `user_id` parameter:

**JobStore:**
- `create_job(job_id, user_id='default')`
- `get_job(job_id, user_id=None)` - filters by user if provided
- `list_jobs(user_id=None, limit, outcome_status)`
- `delete_job(job_id, user_id=None)`
- `update_job(job_id, user_id=None, **kwargs)`
- `get_outcome_metrics(user_id=None)`
- `update_outcome(job_id, outcome_status, notes, user_id=None)`

**CVStore:**
- `create_cv(name, filename, content, user_id='default', is_default)`
- `get_cv(cv_id, user_id=None)`
- `get_cv_content(cv_id, user_id=None)`
- `list_cvs(user_id=None)`
- `delete_cv(cv_id, user_id=None)`
- `set_default(cv_id, user_id=None)`
- `get_default_cv(user_id=None)`
- `update_cv(cv_id, user_id=None, name, content)`

### 4. API Endpoints

**File**: `backend/main.py`

New endpoints:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |
| GET | `/api/users/{id}` | Get user details |

Updated all existing endpoints to:
- Accept `X-User-ID` header (defaults to 'default')
- Pass user_id to store methods for filtering/ownership verification

### 5. Frontend Types

**File**: `frontend/src/types.ts`

Added:
```typescript
export interface User {
  id: string;
  name: string;
  created_at: string;
}
```

### 6. Frontend API Client

**File**: `frontend/src/api.ts`

Added user state management:
```typescript
let currentUserId: string | null = null;

export function setCurrentUser(userId: string): void
export function getCurrentUser(): string
export function clearCurrentUser(): void
function getUserHeaders(): HeadersInit
```

Added user API functions:
```typescript
export async function getUsers(): Promise<User[]>
export async function createUser(name: string): Promise<User>
export async function getUser(userId: string): Promise<User>
```

All fetch calls updated to include `X-User-ID` header.

### 7. Profile Selector UI

**File**: `frontend/src/App.tsx`

Added to header:
- User icon + dropdown selector
- "+" button to add new user
- Modal for creating new users

State management:
- `users` - list of all users
- `currentUserId` - currently selected user
- `refreshKey` - triggers child component refresh on user change

User preference persisted in localStorage.

---

## Technical Details

### User ID Generation

Short UUIDs (8 characters) for user IDs:
```python
user_id = str(uuid.uuid4())[:8]
```

### Header-Based Authentication

Simple X-User-ID header approach (no JWT/session):
```typescript
headers: { 'X-User-ID': getCurrentUser() }
```

### Data Isolation

Each user sees only their own:
- Jobs (applications)
- CVs (stored resumes)
- Metrics (funnel, rates)
- Default CV setting

### Backwards Compatibility

- All user_id parameters default to 'default'
- Existing data automatically migrated
- No breaking changes to API contract

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/job_store.py` | +UserStore class, +user_id to all methods |
| `backend/main.py` | +user endpoints, +X-User-ID header handling |
| `frontend/src/types.ts` | +User interface |
| `frontend/src/api.ts` | +user management, +header to all fetches |
| `frontend/src/App.tsx` | +profile selector UI |
| `ideas.db` | #21 marked as Done |
| `MASTER_VISION.md` | Updated with Track 2.6 |
| `CLAUDE.md` | Updated status and endpoints |

---

## Ideas Database Updates

Marked as complete:
- #21 Lightweight multi-user profile selector - **Done**

---

## Verification Steps

1. **Backend**: Start server, check `/docs`
   - Create user: `POST /api/users` with `{"name": "David"}`
   - Create second user: `POST /api/users` with `{"name": "Sarah"}`
   - List users: `GET /api/users`

2. **Frontend**: Open http://localhost:5173
   - Profile selector shows in header (right side)
   - Switch between users using dropdown
   - Click "+" to add new user
   - Each user sees only their data

3. **Data isolation verification**:
   - Create application as User A
   - Switch to User B - application not visible
   - Switch back to User A - application visible
   - Metrics show only current user's data

---

## Future Auth Integration (Track 3)

When adding full authentication:
1. Add `password_hash` to users table
2. Replace X-User-ID header with JWT token
3. Add login/logout endpoints
4. Data isolation already works - just swap auth mechanism

---

## Session 2: UI Enhancements & Ideas Backlog (25 Jan - Later)

### Job Detail View

Added `/job/:id` route with full job detail page:
- **File**: `frontend/src/components/JobDetail.tsx`
- Shows job metadata (backend, model, dates, ATS score)
- File preview with download links
- Outcome status selector (inline editing)
- Navigation back to dashboard

Made dashboard rows clickable:
- Application table rows → navigate to job detail
- Active job rows → navigate to job detail

### Model Column in Dashboard

Added Model column to applications table:
- Shows which LLM model was used (e.g., "qwen2.5:14b")
- Between Backend and ATS columns
- Updated backend to return `model` field from metadata

**Files modified:**
- `backend/main.py` - Added model field to applications response
- `frontend/src/components/Dashboard.tsx` - Added Model column
- `frontend/src/types.ts` - Added model to Application type
- `frontend/src/api.ts` - Added model to normalizeApplication

### Ideas Backlog Expansion

Created `docs/raw/` folder for capturing LLM conversation outputs.

Extracted 19 new feature ideas from `docs/raw/newideas.md`:
- ATS Confidence Score (P4)
- Cultural Fit Tone-shifting (P4)
- LinkedIn Optimizer (P4)
- JD Red-flag Detector (P4)
- Pipeline Health Diagnosis (P5)
- Mock AI Interviewer (P4)
- STAR Behavioral Coach (P4)
- Salary Benchmarking (P4)
- Offer Comparator (P4)
- And 10 more...

**Total ideas now: 41** (was 22)

### Interactive Ideas HTML Page

Improved `scripts/ideas_html.py` with full filtering:
- Tag filters: Status, Priority, Impact, Complexity, Category
- Sortable columns (click headers)
- Text search
- Clear All button
- Color-coded badges

Run with: `python scripts/ideas_html.py`

### Commits

1. `a66e318` - Add job detail view and model column to dashboard

---

## Next Steps

1. **Start validation phase** with 2 users (David, Tomomi)
2. Apply for real jobs using the web UI
3. Track outcomes as applications progress
4. Compare metrics between users
5. After 10-20 tracked applications, evaluate Track 3
6. Review ideas backlog periodically for next features

---

**Track 2.6: COMPLETE**
**Ready for**: Multi-user validation phase

---

**END OF DIARY ENTRY 012**
