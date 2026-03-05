# Project Diary — Entry 060

**Date**: 2026-03-05
**Track**: 3.0 COMPLETE — CV Coach
**Branch**: `main`
**Theme**: Candidate Profile — Education, Summary, Section Config, CV Preview

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Added 5 enhancements to Candidate Profile: Education section, Professional Summary card, CV Section Order panel, CV Preview panel, and `summary`/`section_config` columns on the profile table. Also fixed a pre-existing bug where `cert_grouping_mode`, `summary`, and `section_config` were silently dropped by the backend Pydantic model.
- **Next steps**: No specific next task — check ideas backlog
- **Blocked/broken**: Nothing. Restart backend after pulling to pick up new migrations and endpoints.
- **Ideas backlog**: Nothing notable

---

## What Was Done

Five incremental enhancements to the Candidate Profile page, implemented in a single session from a detailed plan.

### Database (`backend/job_store.py`)

- New `education` table: `id`, `user_id`, `institution`, `qualification`, `grade`, `field_of_study`, `start_date`, `end_date`, `is_current`, `display_order`, `created_at`, `updated_at`
- Migrations (idempotent ALTER TABLE): `summary TEXT` and `section_config TEXT` on `candidate_profiles`
- `update_profile()` allowed set expanded to include `summary` and `section_config`
- 6 new `ProfileStore` methods: `_row_to_edu()`, `list_education()`, `create_education()`, `update_education()`, `delete_education()`, `reorder_education()` — follow the same certifications pattern exactly

### CV Assembler (`backend/cv_assembler.py`)

- `assemble_summary_section(profile)`: renders `PROFESSIONAL SUMMARY\n{text}` from `profile["summary"]`; returns empty string if no summary set
- `assemble_education_section(education)`: renders `EDUCATION` heading + one block per record with `<!-- EDU:id -->` marker, `qualification | institution`, date range, optional `Grade: X | field_of_study` line

### Backend API (`backend/main.py`)

- **`ProfileUpdate` Pydantic model** fixed to include `cert_grouping_mode`, `summary`, `section_config` (these were previously missing — a silent data-loss bug)
- New Pydantic models: `EducationCreate`, `EducationUpdate` (all fields optional in Update)
- 5 new endpoints following certifications pattern:
  - `GET /api/profile/education`
  - `POST /api/profile/education` (201)
  - `PUT /api/profile/education/reorder`
  - `PUT /api/profile/education/{edu_id}`
  - `DELETE /api/profile/education/{edu_id}`
- `assemble-cv` endpoint updated:
  - Now fetches education, calls `assemble_summary_section` and `assemble_education_section`
  - Parses `profile["section_config"]` JSON (falls back to `DEFAULT_SECTIONS` if null/invalid)
  - Returns `summary_text`, `education_text` (new keys), and `sections: [{key, label, text, visible}]` in configured order
  - All existing keys preserved for backward compatibility (`CvCoach`, `CVTextEditor`, `CVManager` unaffected)

### Frontend Types (`frontend/src/types.ts`)

- New `Education` interface + `EducationCreate`/`EducationUpdate` type aliases
- New `SectionConfig` interface: `{ key: string; label: string; visible: boolean }`
- `CandidateProfile` updated: `summary: string | null`, `section_config: string | null`
- `assembleCV()` return type extended with `summary_text`, `education_text`, `sections`

### Frontend API (`frontend/src/api.ts`)

- 5 new education functions: `listEducation()`, `createEducation()`, `updateEducation()`, `deleteEducation()`, `reorderEducation()`
- `assembleCV()` return type updated to include all new fields

### Frontend Component (`frontend/src/components/CandidateProfile.tsx`)

**New sub-components:**

- **`EduModal`**: modal form with qualification (required), institution (required), field of study, grade, start year, end year + "Current" checkbox; plain text year inputs (e.g. "2018"), not date pickers
- **`EducationSection`** (right column, above Skills): card with Add button, entries showing `qualification | institution`, date range, grade chip, reorder arrows, edit/delete
- **`SectionConfigPanel`** (left column, collapsible): lists 6 CV sections in configured order; Eye/EyeOff toggle for visibility, ChevronUp/Down to reorder; every change immediately persisted to profile via `updateProfile({ section_config: ... })`
- **`SummarySection`** (left column, above Personal Info): textarea (4 rows), character count, Save button (appears when dirty), Generate button (two-click: first click expands JD textarea, second fires `assembleCV()` + `generateSummary()`); `result.summary` populated into textarea — user still clicks Save to persist
- **`ProfilePreview`** (full-width below two-column grid, collapsed by default): on expand calls `assembleCV()`, concatenates contact header + visible sections in configured order into a read-only monospace textarea; Refresh button re-fetches

**Main component changes:**

- New state: `education: Education[]`, `sectionConfig: SectionConfig[]`
- `load()` now fetches `listEducation()` in parallel with existing data (7 concurrent requests)
- On load, parses `profile.section_config` JSON to restore section order/visibility; falls back to `DEFAULT_SECTION_CONFIG` constant
- Updated layout: left column now `SectionConfigPanel → SummarySection → PersonalInfoSection → IssuingOrgsAdmin → CertificationsSection → ProfessionalDevelopmentSection`; right column now `JobHistorySection → EducationSection → SkillsSection`; `ProfilePreview` full-width below

### Bug Fixed

`ProfileUpdate` Pydantic model in `backend/main.py` was missing `cert_grouping_mode`, `summary`, and `section_config`. These fields were being silently dropped by Pydantic before reaching `job_store.update_profile()`, meaning saving the certification grouping mode, summary text, and section config never actually persisted to the database. Fixed by adding all three optional fields to the model.

---

## Key Behaviours

- **Education section order**: `display_order ASC, id ASC` — consistent with certifications/PD
- **Summary generation**: two-click flow avoids accidental LLM calls; user must explicitly Save after generation
- **Section config**: stored as JSON string on `candidate_profiles.section_config`; default order is summary → experience → education → certifications → skills → professional_development
- **Profile Preview**: contact header always prepended; only sections with `visible: true` and non-empty text are included; collapsed by default to avoid unnecessary API calls on page load
- **Backward compatible**: `assembleCV()` still returns all original keys; `CvCoach`, `CVTextEditor`, and `CVManager` destructure only the fields they need and are unaffected
- **`cert_grouping_mode` now actually saves**: the pre-existing bug meant toggling Flat/By Issuer was only held in React state during the session; it now persists to the database
