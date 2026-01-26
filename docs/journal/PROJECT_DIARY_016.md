# Project Diary 016 - Track 2.8.2: Semantic Embeddings Implementation

**Date**: 26 January 2026
**Focus**: Semantic similarity scoring with sentence-transformers

---

## Summary

Completed Track 2.8.2 - semantic embeddings for ATS scoring. The system now uses the `all-MiniLM-L6-v2` model to calculate semantic similarity between CV and JD sections, enabling matching by meaning rather than just exact keywords (e.g., "cloud computing" can match "AWS infrastructure").

---

## What Was Built

### 1. Semantic Scorer (`src/semantic_scorer.py`)

**Data Classes:**
- `SemanticMatch` - Match result with JD/CV sections, similarity, high-value flag
- `SemanticScoreResult` - Full scoring result with section similarities and gaps

**Classes:**
- `EmbeddingCache` - LRU cache (1000 entries) for embeddings to avoid recomputation
- `SemanticScorer` - Main scoring class with:
  - Lazy model loading (avoids startup cost if not used)
  - `embed_text()` / `embed_batch()` with caching
  - `cosine_similarity()` calculation
  - `match_sections()` - Section-to-section semantic matching
  - `calculate_semantic_score()` - Main entry point
  - `_apply_safety_rails()` - Prevents over-matching on vague text

**Section Mapping:**
```
JD Requirements     -> CV Skills, Experience
JD Responsibilities -> CV Experience, Projects
JD Preferred        -> CV Skills, Projects
JD Qualifications   -> CV Skills, Experience, Education, Certifications
JD Overview         -> CV Summary, Experience, Skills
JD About            -> CV Summary
```

**Safety Rails:**
1. Penalize high semantic scores with few hard entities
2. Cap score at 60% if no high-value section matches (Experience/Projects)
3. Reduce score if very few section matches overall

**Graceful Degradation:**
- Works without sentence-transformers (redistributes to 90% lexical + 10% evidence)
- No crashes if model fails to load
- `SemanticScorer.is_available()` for runtime checks

### 2. ATS Optimizer Updates (`src/ats_optimizer.py`)

**New Methods:**
- `calculate_hybrid_score()` - Combines lexical, semantic, evidence scores
- `_clean_llm_output()` - Strips LLM preamble/thinking from structured output

**Hybrid Scoring Formula:**
```
Final Score = (Lexical x 55%) + (Semantic x 35%) + (Evidence x 10%)
```

**Extended Return Values:**
- `hybrid_scoring` dict with component breakdowns
- `semantic_analysis` dict with top matches, gaps, section similarities

**Report Enhancements (v3.0):**
```
HYBRID SCORING BREAKDOWN (Track 2.8.2)
  Final Score: 43.3%

  Components:
    Lexical:    42.7% x 55% =  23.5
    Semantic:   46.2% x 35% =  16.2
    Evidence:   36.7% x 10% =   3.7

SEMANTIC MATCH ANALYSIS (Track 2.8.2)
  Top Semantic Matches:
    1. responsibilities <-> projects: 46% [HIGH-VALUE]

  Section Similarity Scores:
    - responsibilities: 46%
```

---

## Test Results

**Embedding Tests:**
- Embedding shape: 384 dimensions (correct for all-MiniLM-L6-v2)
- Similar text similarity: 71% ("Python ML" vs "Data science Python")
- Unrelated text similarity: 10% ("Python ML" vs "Cooking recipes")
- Cache working correctly with LRU eviction

**Integration Tests:**
- Semantic scoring working with real CV/JD pairs
- High-value matches correctly detected ([HIGH-VALUE] tag)
- Section mapping expanded to include overview/about sections

**Real Job Tests:**
- Global Relay PM role: 46.2% semantic (responsibilities <-> projects)
- Milbank Sustainability role: 38% semantic (preferred <-> projects)
- Hybrid scoring correctly combines all components

---

## Files Changed

| File | Change |
|------|--------|
| `src/semantic_scorer.py` | NEW - Embedding and semantic scoring (~280 lines) |
| `src/ats_optimizer.py` | Modified - Hybrid scoring integration (+70 lines) |
| `requirements.txt` | Modified - Added sentence-transformers>=2.2.0 |

---

## Bug Fixes During Implementation

1. **NumPy import error** - Made numpy import conditional along with sentence-transformers
2. **Section mapping gaps** - Extended SECTION_MAPPING to include JD overview/about sections
3. **LLM preamble in report** - Added `_clean_llm_output()` to strip "Here is the analysis..." text

---

## Branch & Commit

- **Branch**: `track2.8-semantic-ats`
- **Commit**: `c1b04c9` - "Add Track 2.8.2: Semantic embeddings for ATS scoring"
- **Pushed**: Yes

---

## What's Next

**Track 2.8.3: Constraint Penalties (Optional)**
- Must-have skill penalties
- Years of experience matching
- Certification requirement flags

**Track 2.9: Interactive CV Improvement**
- Use gap analysis to suggest additions
- Section-by-section improvement recommendations

---

## Notes

The semantic scoring provides meaningful differentiation:
- Low lexical match (13%) + decent semantic match (38%) = 24% final score
- This recognizes transferable skills even when exact keywords don't match

The embedding model (~90MB) downloads automatically on first use and is cached locally. Model loads lazily to avoid startup cost when semantic scoring isn't needed.

---

**Session Duration**: ~1.5 hours
**Lines of Code**: ~350 added
