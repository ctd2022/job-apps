# PROJECT DIARY 011 - Track 2.5: Application Outcome Tracking

**Date**: 24 January 2026
**Focus**: Outcome tracking for validation phase
**Status**: Complete

---

## Summary

Implemented application outcome tracking to enable measuring success metrics before entering the validation phase. This is MVP for validation - cannot measure success without tracking outcomes.

---

## Features Implemented

### 1. Database Schema Changes

**File**: `backend/job_store.py`

Added new columns to `jobs` table:
- `outcome_status` TEXT DEFAULT 'draft' - Status in hiring funnel
- `submitted_at` TEXT - When application was submitted
- `response_at` TEXT - When first response received
- `outcome_at` TEXT - When final outcome determined
- `notes` TEXT - User notes about communications

Added `OutcomeStatus` enum:
```python
class OutcomeStatus(str, Enum):
    draft = "draft"           # Documents generated, not yet submitted
    submitted = "submitted"   # Application submitted to company
    response = "response"     # Got a response (not interview)
    interview = "interview"   # Interview scheduled/completed
    offer = "offer"           # Received job offer
    rejected = "rejected"     # Application rejected
    withdrawn = "withdrawn"   # Candidate withdrew application
```

Added new methods:
- `update_outcome()` - Update status with automatic timestamp handling
- `get_outcome_metrics()` - Calculate funnel metrics and rates

### 2. API Endpoints

**File**: `backend/main.py`

New endpoints:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/api/jobs/{job_id}/outcome` | Update status and notes |
| GET | `/api/metrics` | Get funnel metrics |

Updated endpoints:
- `GET /api/jobs` - Added `outcome_status` filter parameter
- `GET /api/applications` - Includes outcome tracking fields

Auto-timestamp logic:
- `submitted` -> sets `submitted_at`
- `response/interview` -> sets `response_at`
- `offer/rejected/withdrawn` -> sets `outcome_at`

### 3. Frontend Types

**File**: `frontend/src/types.ts`

Added types:
- `OutcomeStatus` - Union type for status values
- `OutcomeUpdate` - Request type for status updates
- `Metrics` - Response type for funnel metrics

Updated `Job` and `Application` interfaces with outcome fields.

### 4. API Client

**File**: `frontend/src/api.ts`

Added functions:
- `updateJobOutcome()` - PATCH to update status
- `getMetrics()` - GET funnel metrics
- `normalizeApplication()` - Include outcome fields

### 5. Dashboard Metrics

**File**: `frontend/src/components/Dashboard.tsx`

Added funnel visualization:
- Horizontal bar chart showing: Submitted -> Response -> Interview -> Offer
- Conversion rates between stages
- Rate boxes: Response Rate, Interview Rate, Offer Rate
- Average time to response display
- Status column in recent applications table

### 6. Application History

**File**: `frontend/src/components/ApplicationHistory.tsx`

Added:
- Status filter dropdown (alongside backend filter)
- Status column in table with color-coded badges
- Inline status editing in expanded row
- Notes input and display
- Key dates display (submitted, response, outcome)

---

## Technical Details

### Status Colors

| Status | Background | Text |
|--------|------------|------|
| draft | slate-100 | slate-600 |
| submitted | blue-100 | blue-700 |
| response | indigo-100 | indigo-700 |
| interview | purple-100 | purple-700 |
| offer | green-100 | green-700 |
| rejected | red-100 | red-700 |
| withdrawn | gray-100 | gray-500 |

### Metrics Calculation

```
Funnel counts:
- submitted = jobs in submitted+ status
- response = jobs in response, interview, offer, or rejected
- interview = jobs in interview or offer
- offer = jobs in offer status

Rates (as % of submitted):
- response_rate = response / submitted * 100
- interview_rate = interview / submitted * 100
- offer_rate = offer / submitted * 100
```

### Migration Strategy

- SQLite `ALTER TABLE` wrapped in try/except for idempotency
- Existing jobs default to `outcome_status = 'draft'`
- No data loss - purely additive changes

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/job_store.py` | +OutcomeStatus enum, +columns, +methods |
| `backend/main.py` | +2 endpoints, updated responses |
| `frontend/src/types.ts` | +OutcomeStatus, +Metrics, updated interfaces |
| `frontend/src/api.ts` | +updateJobOutcome, +getMetrics |
| `frontend/src/components/Dashboard.tsx` | +FunnelChart, +RateBox, +status column |
| `frontend/src/components/ApplicationHistory.tsx` | +status filter, +inline editing |
| `ideas.db` | #19 and #20 marked as Done |
| `MASTER_VISION.md` | Updated with Track 2.5 |
| `CLAUDE.md` | Updated current status |

---

## Ideas Database Updates

Marked as complete:
- #19 Application outcome tracking - **Done**
- #20 Success metrics dashboard - **Done**

---

## Verification Steps

1. **Database**: Start backend, check `jobs.db` has new columns
2. **API**: Test via http://localhost:8000/docs
   - PATCH `/api/jobs/{id}/outcome` with `{"outcome_status": "submitted"}`
   - GET `/api/metrics` returns funnel data
3. **UI**:
   - ApplicationHistory shows status column and filter
   - Expand row, change status, verify it saves
   - Dashboard shows funnel chart when applications are submitted

---

## Next Steps

1. **Start using the system** for real job applications
2. Track outcomes as applications progress
3. Monitor metrics to validate effectiveness
4. After 10-20 tracked applications, decide on Track 3

---

**Track 2.5: COMPLETE**
**Ready for**: Validation Phase

---

**END OF DIARY ENTRY 011**
