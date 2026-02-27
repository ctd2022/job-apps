# Project Diary — Entry 056

**Date**: 2026-02-27
**Ideas**: #240, #241 — Certifications + Skills sections on Candidate Profile; cert name accent colour
**Status**: Done

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Added Certifications and Skills sections to the Candidate Profile page (Idea #240). Certifications use modal-based CRUD with reorder arrows; Skills use inline chip-based add/delete grouped by category. Both have full backend CRUD with new SQLite tables. Cert names styled in Amazon orange (#FF9900) (Idea #241).
- **Next steps**: Idea #239 — highlight inserted summary text in CV editor; or start Track 4 planning
- **Blocked/broken**: Nothing
- **Ideas backlog**: #239 summary insertion highlight (Low, deferred); Skills section could later serve as a pick-list when tailoring applications

---

## What Changed

### Idea #240 — Certifications and Skills on Candidate Profile

The profile page previously had Personal Info (left column) and Work Experience (right column). We added two new structured sections to make the profile more component-based and to build toward remixable CV assembly.

#### New database tables

**`certifications`** — stores professional credentials:
- `name`, `issuing_org`, `date_obtained`, `no_expiry` (bool), `expiry_date`
- `credential_id`, `credential_url` for verification links
- `display_order` + standard `created_at`/`updated_at`

**`skills`** — flat skill list with optional grouping:
- `name`, `category` (nullable), `display_order`

Both tables are added in `init_db()` with `CREATE TABLE IF NOT EXISTS` — fully idempotent on re-start.

#### Backend additions (`backend/job_store.py`)

Added to `ProfileStore`:
- `list/create/update/delete/reorder_certifications()` — full CRUD, mirrors the job history pattern
- `list/create/update/delete_skill()` — CRUD; `list_skills` orders by `category ASC, display_order ASC`

`no_expiry` stored as `INTEGER 0/1` in SQLite, serialised as Python `bool` via `_row_to_cert()`.

#### Backend additions (`backend/main.py`)

New Pydantic models: `CertificationCreate`, `CertificationUpdate`, `SkillCreate`, `SkillUpdate`.

New endpoints:
- `GET/POST /api/profile/certifications`
- `PUT /api/profile/certifications/reorder`
- `PUT/DELETE /api/profile/certifications/{id}`
- `GET/POST /api/profile/skills`
- `PUT/DELETE /api/profile/skills/{id}`

`GET /api/profile/assemble-cv` extended to also call `assemble_certifications_section()` and `assemble_skills_section()`, returning `certifications_text` and `skills_text` in addition to the existing `contact_header` and `experience_text`. Existing callers (`CvCoach`, `CVTextEditor`, `CVManager`) destructure only what they need — no breakage.

#### Backend additions (`backend/cv_assembler.py`)

`assemble_certifications_section(certifications)`:
- Renders a `CERTIFICATIONS` heading followed by one line per cert
- Format: `Name | Org | date_obtained – expiry (or "No Expiry") | ID: credential_id | credential_url`
- Each entry wrapped in `<!-- CERT:id -->` markers for future bidirectional sync

`assemble_skills_section(skills)`:
- Renders a `SKILLS` heading with skills grouped under category headings
- Format: `Languages: Python, TypeScript, SQL`
- Uncategorised skills listed individually after grouped ones

#### Frontend additions

`frontend/src/types.ts` — `Certification`, `Skill` interfaces; `CertificationCreate/Update`, `SkillCreate/Update` type aliases.

`frontend/src/api.ts` — `list/create/update/delete/reorderCertifications`, `list/create/update/deleteSkill`; `assembleCV()` return type extended.

`frontend/src/components/CandidateProfile.tsx`:
- `CertModal` — 6-field form with No Expiry checkbox that hides/replaces the expiry date input
- `CertificationsSection` — modal CRUD, reorder arrows (same pattern as Work Experience), credential URL link icon, grouped under the left column below Personal Info
- `SkillsSection` — inline chip add row with name + category (datalist of existing categories); chips grouped under bold category headers; click a chip to edit name/category inline; ✕ to delete; grouped under the right column below Work Experience
- Page layout updated: each column is now a `space-y-4` div wrapping two sections each

### Idea #241 — Cert name accent colour

Certification names in the card are now rendered in Amazon orange (`#FF9900`) with `font-semibold` weight. This makes the credential title immediately legible at a glance — especially valuable when scanning a list of similar-sounding AWS certs.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/job_store.py` | Two new tables in `init_db()`; 9 new `ProfileStore` methods |
| `backend/main.py` | 4 new Pydantic models; 9 new endpoints; `assemble-cv` extended |
| `backend/cv_assembler.py` | `assemble_certifications_section()` + `assemble_skills_section()` |
| `frontend/src/types.ts` | `Certification`, `Skill` interfaces + aliases |
| `frontend/src/api.ts` | 9 new API functions; `assembleCV()` return type extended |
| `frontend/src/components/CandidateProfile.tsx` | `CertModal`, `CertificationsSection`, `SkillsSection`; layout restructure; cert name accent colour |
