# Project Diary 015 - Track 2.8.1: Section Detection & Entity Extraction

**Date**: 25 January 2026
**Focus**: Foundational NLP for section-level ATS matching

---

## Summary

Implemented Track 2.8.1 - the foundation for hybrid semantic ATS scoring. Added section detection and entity extraction capabilities that enable section-level matching (JD Requirements -> CV Experience) and evidence-weighted scoring (skills demonstrated with metrics score higher than skills just listed).

---

## What Was Built

### 1. Entity Taxonomy (`src/entity_taxonomy.py`)

Extensible dictionaries containing:
- **250+ hard skills**: Programming languages, frameworks, cloud, DevOps, ML/AI, databases
- **60+ soft skills**: Communication, leadership, teamwork, problem solving
- **80+ certifications**: AWS, Azure, GCP, PMP, Scrum, security certs
- **50+ methodologies**: Agile, Scrum, DevOps, TDD, microservices
- **80+ domains**: FinTech, Healthcare, SaaS, E-commerce
- **Regex patterns**: Job titles, years of experience
- **Action verbs**: For evidence strength scoring (led, delivered, achieved)
- **Metric patterns**: For detecting quantified achievements (%, $, users)

### 2. Document Parser (`src/document_parser.py`)

**Data Classes:**
- `CVSectionType` / `JDSectionType` - Enums for section classification
- `Entity` - Extracted entity with type, section, evidence strength
- `Section` - Parsed section with content and entities
- `ParsedCV` / `ParsedJD` - Fully parsed documents with helper methods

**Classes:**
- `SectionDetector` - Regex-based section boundary detection
- `EntityExtractor` - Rule-based entity extraction with evidence scoring
- `DocumentParser` - Main entry point combining both

**Section Detection:**
- CV: Summary, Skills, Experience, Education, Certifications, Projects
- JD: Overview, Responsibilities, Requirements, Preferred, Qualifications, Benefits

**Evidence Strength Scoring:**
- Base strength: 1.0
- +0.2 if in Experience section
- +0.15 if in Projects section
- +0.2 if nearby metrics (percentages, dollar amounts)
- +0.1 if nearby action verbs (led, delivered, achieved)

### 3. ATS Optimizer Integration (`src/ats_optimizer.py`)

Added methods:
- `_calculate_section_match()` - Maps JD skills to CV sections
- `_calculate_evidence_scores()` - Calculates weighted evidence scores

Extended `calculate_ats_score()` return value with:
- `section_analysis`: Skills by section (experience, skills, projects, not found)
- `evidence_analysis`: Strong/moderate/weak evidence counts
- `parsed_entities`: Extracted skills from CV and JD

Enhanced ATS report with new section:
```
--------------------------------------------------------------------------------
                    SECTION-LEVEL ANALYSIS (Track 2.8)
--------------------------------------------------------------------------------
  CV Sections Detected: 30
  JD Sections Detected: 5

  Skills demonstrated in EXPERIENCE: docker, kubernetes, ...
  Skills listed in SKILLS section:   python, aws, ...
  Skills NOT found in CV:            martech, stakeholder management, ...

  Evidence Strength Analysis:
    - Strong evidence (with metrics/context): 5 skills
    - Moderate evidence:                      12 skills
    - Weak evidence (just listed):            3 skills
    - Average evidence strength:              1.1
```

---

## Test Results

**Real CV (`inputs/davidcv.txt`):**
- Detected 30 sections
- Extracted 55 entities
- Hard skills found: aws, azure, data engineering, etl, google cloud, llms, machine learning, mlops, neural networks, sagemaker, sql, tensorflow, xml
- Soft skills found: agility, coaching, collaboration, communication, drive, leadership, mentoring, organization, team leadership

**Integration Test:**
- Section matching correctly categorizes skills by where they appear
- Evidence scoring differentiates demonstrated vs listed skills
- ATS report includes new section-level insights

---

## Files Changed

| File | Change |
|------|--------|
| `src/entity_taxonomy.py` | NEW - Entity dictionaries |
| `src/document_parser.py` | NEW - Section detection & entity extraction |
| `src/ats_optimizer.py` | Modified - Integrated DocumentParser |

---

## Ideas Added

| ID | Title | Priority |
|----|-------|----------|
| #80 | Job title capture and display | High |

**Pending ideas** (to add later):
- Multiple CVs per user
- Interactive CV gap-fill workflow

---

## Branch & Commit

- **Branch**: `track2.8-semantic-ats`
- **Commit**: `fceb88d` - "Add Track 2.8.1: Section detection and entity extraction"
- **Pushed**: Yes

---

## What's Next

**Track 2.8.2: Semantic Embeddings**
- Integrate local embedding model (e.g., sentence-transformers)
- Calculate cosine similarity between CV and JD sections
- Add semantic matching alongside lexical matching

**Track 2.8.3: Hybrid Scoring**
- Combine: `Final = (Lexical x 0.55) + (Semantic x 0.35) + (Evidence x 0.10)`
- Add constraint penalties (must-haves, years, certifications)

---

## Notes

The section-level analysis now shows useful gap information. In the test run:
- "Skills NOT found in CV: martech, stakeholder management, wealth management, content management, financial services"

This directly feeds into the future interactive CV improvement feature - we can now tell users exactly which skills to add and where they should demonstrate them.

---

**Session Duration**: ~1 hour
**Lines of Code**: ~1,350 added
