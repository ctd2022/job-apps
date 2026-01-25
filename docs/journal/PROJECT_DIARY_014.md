# Project Diary 014 - Enhanced ATS Scoring Algorithm

**Date**: 25 January 2026
**Focus**: ATS Analysis Improvements + Ideas Management Enhancements

---

## Summary

Major overhaul of the ATS (Applicant Tracking System) scoring algorithm with new features:
- N-gram extraction (multi-word phrases)
- Synonym/abbreviation matching
- Role variation matching (manager ↔ management)
- Weighted scoring by category
- Improved report formatting with tables

Also enhanced the ideas management system with source URLs and multi-select filters.

---

## ATS Enhancements (Feature #74)

### 1. N-gram Extraction
- Now extracts 2-word and 3-word phrases (bigrams/trigrams)
- Catches important terms like "machine learning", "project management"
- Previously only extracted single words

### 2. Abbreviation/Synonym Mapping
60+ mappings including:
- JS ↔ JavaScript
- AWS ↔ Amazon Web Services
- ML ↔ Machine Learning
- K8s ↔ Kubernetes
- CI/CD variations

### 3. Role Variation Matching (NEW)
Matches job titles with related skills:
- manager ↔ management ↔ managing
- engineer ↔ engineering
- developer ↔ development
- lead ↔ leader ↔ leadership
- programme ↔ program (+ plurals)

### 4. Weighted Scoring
Categories now weighted by importance:
- Critical Keywords: 3.0x
- Hard/Technical Skills: 2.5x
- Required Skills: 2.0x
- Soft Skills: 1.5x
- Preferred/Bonus: 1.0x
- Other Keywords: 0.5x

### 5. Enhanced Report Format
New table-based layout:
```
================================================================================
              ATS OPTIMIZATION REPORT v2.0 (Enhanced)
================================================================================

  OVERALL SCORE: XX%    |    Keywords Matched: X / Y

--------------------------------------------------------------------------------
                           SCORE BY CATEGORY
--------------------------------------------------------------------------------
  Category                    | Match  | Score | Top Missing
  ----------------------------|--------|-------|-----------------------------
  Critical Keywords           |  X/Y   |  XX%  | ...

--------------------------------------------------------------------------------
                         KEYWORD MATCHING TABLE
--------------------------------------------------------------------------------
  MATCHED (in your CV)           | MISSING (consider adding)
  -------------------------------|--------------------------------

--------------------------------------------------------------------------------
                       KEY PHRASES (2-word terms)
--------------------------------------------------------------------------------
  MATCHED PHRASES              | MISSING PHRASES
  -----------------------------|--------------------------------
```

### 6. Expanded Stopwords
Added 70+ job posting boilerplate words:
- responsibilities, requirements, qualifications
- candidate, position, role, opportunity
- preferred, required, ideal, excellent

---

## Ideas Management Enhancements

### Source URL Tracking
- Added `source_url` column to ideas database
- Ideas can now link to source articles/case studies
- Updated `ideas.py` CLI and `ideas_html.py` generator

### Multi-Select Filters
- HTML page now supports selecting multiple filter values
- Can filter by multiple statuses, priorities, categories simultaneously
- Click to toggle, "All" clears selection

### New Ideas from Mane AI Case Study
Added 4 ideas from external research:
- #70: Structured CV-to-Job Scoring (1-5 scale)
- #71: Batch CV Processing
- #72: Historical Application Analytics
- #73: Job Fit Ranking / Shortlist

---

## Files Modified

### ATS Optimizer
- `src/ats_optimizer.py` - Complete rewrite of scoring algorithm

### Backend
- `backend/main.py` - Moved ATSOptimizer import to module level

### Ideas Management
- `scripts/ideas.py` - Added source_url support
- `scripts/ideas_html.py` - Added source URL links, date column, multi-select filters
- `ideas.db` - Added source_url column

### Frontend Config
- `frontend/vite.config.ts` - Temporarily changed proxy port during debugging

---

## Technical Notes

### Import Caching Issue
Encountered persistent issue where uvicorn wasn't loading updated ats_optimizer.py:
- Root cause: Multiple Python processes on port 8000, lazy imports inside functions
- Solution: Moved ATSOptimizer import to module level, killed stale processes
- Learning: Always import modules at top level for reliable hot-reloading

### Google Drive Path
Project lives on Google Drive (`My Drive/Kaizen/job_applications`), which can cause:
- File sync delays
- Path escaping issues in some tools
- Recommend: Be aware of sync status during rapid iterations

---

## Ideas Status

```
#74 Enhanced ATS Scoring Algorithm -> Done
```

---

## Known Issues / Next Session

**ATS scoring needs more refinement:**
1. Phrase matching still not 100% reliable (Programme Manager vs Programme Management)
2. French text appearing in some job descriptions confuses keyword extraction
3. Score seems low even with good CV-job fit
4. Need more testing with diverse job descriptions

**Recommendation**: Dedicate next 2-3 sessions to ATS testing and refinement before moving to new features.

---

## Next Steps

1. Continue ATS validation with real job applications
2. Debug phrase matching edge cases
3. Consider adding debug mode to see matching details
4. Test with various industries/job types
