# Project Diary — Entry 059

**Date**: 2026-03-05
**Track**: 3.0 COMPLETE — CV Coach
**Branch**: `main`
**Idea**: #281 — Issuing Organisation as First-Class Entity

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: 3.0 COMPLETE — CV Coach
- **Last session**: Implemented Idea #281 — Issuing Organisation as first-class entity with its own table, admin UI, brand colour, and grouping mode for certifications
- **Next steps**: No specific next task — check ideas backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing notable

---

## What Was Done

Implemented Idea #281 — Issuing Organisation as a first-class entity, replacing free-text `issuing_org` on certifications with a proper FK relationship, admin UI, brand colours, and cert grouping by issuer.

### Database (`backend/job_store.py`)

- New `issuing_organisations` table: `id`, `name` (UNIQUE), `display_label`, `colour` (hex, default `#6366f1`), `logo_url`, `created_at`, `updated_at`
- Migration: `issuing_org_id INTEGER REFERENCES issuing_organisations(id)` added to `certifications`
- Migration: seeds orgs from distinct existing `issuing_org` text values and links existing certs
- Migration: `cert_grouping_mode TEXT DEFAULT 'flat'` added to `candidate_profiles`
- `update_profile()` now accepts `cert_grouping_mode`
- New `ProfileStore` methods: `list_orgs()`, `create_org()`, `update_org()`, `delete_org()` (blocked if certs reference it)
- `_resolve_issuing_org()`: resolves org ID from `issuing_org_id` or free text, auto-creates org from text if needed
- `list_certifications()`, `create_certification()`, `update_certification()`: JOIN with `issuing_organisations`, sync both `issuing_org_id` and `issuing_org` text

### Backend API (`backend/main.py`)

- New Pydantic models: `IssuingOrgCreate`, `IssuingOrgUpdate`
- 4 new endpoints (global, not user-scoped): `GET/POST/PUT/DELETE /api/profile/issuing-organisations`
  - DELETE returns 409 if certs reference the org
- Updated `CertificationCreate/Update`: added optional `issuing_org_id`; `issuing_org` now defaults to `''`
- `assemble-cv` endpoint: fetches orgs and `cert_grouping_mode` from profile, passes to assembler

### CV Assembler (`backend/cv_assembler.py`)

- `assemble_certifications_section(certifications, orgs=None, grouping_mode='flat')`
  - `flat`: original behaviour
  - `by_org`: groups by `issuing_org_id`, emits org `display_label` (or name) as subheading per cluster; ungrouped certs appear under "Other"
- Private `_format_cert_line()` extracted for reuse

### Frontend Types (`frontend/src/types.ts`)

- New `IssuingOrganisation` interface + `IssuingOrgCreate`/`IssuingOrgUpdate` type aliases
- `Certification` updated: `issuing_org_id: number | null`, `org_colour: string | null`, `org_display_label: string | null`
- `CertificationCreate` excludes `org_colour` and `org_display_label` (joined fields)
- `CandidateProfile` updated: `cert_grouping_mode: 'flat' | 'by_org' | null`

### Frontend API (`frontend/src/api.ts`)

- 4 new functions: `listIssuingOrgs()`, `createIssuingOrg()`, `updateIssuingOrg()`, `deleteIssuingOrg()` (orgs are global, no user header needed)

### Frontend Component (`frontend/src/components/CandidateProfile.tsx`)

- **`CertFormState`**: added `issuing_org_id: number | null`; `certToForm`/`formToCertCreate` updated accordingly
- **`CertModal`**: replaced free-text `issuing_org` input with org `<select>` showing colour swatch + quick-create inline field (auto-selects the new org on creation); falls back to free-text if no org selected
- **`IssuingOrgsAdmin`** (new collapsible section above Certifications):
  - List of orgs: colour swatch + name + display_label; click Pencil → inline edit with colour picker + hex input + label field
  - Add new org row with native colour picker + name + short label
  - Delete blocked gracefully (shows alert if 409 from server)
- **`CertificationsSection`**: accepts `orgs`, `groupingMode`, `onGroupingModeChange`, `onOrgCreated` props
  - Flat/By Issuer segmented toggle in header; change persists to profile via `updateProfile`
  - Cert card: left border coloured by `org_colour`; org name shown as `org_display_label` or `issuing_org`
  - By Issuer view: coloured org chip as subheading, certs grouped beneath
- Main page: loads orgs in parallel with other data, restores `cert_grouping_mode` from profile

### Commit

`eed88ee feat: promote Issuing Organisation to first-class entity (Idea #281)`

---

## Key Behaviours

- **Backward compatible**: existing certs get `issuing_org_id` set automatically on first `init_db()` run; free-text `issuing_org` column preserved for fallback
- **Auto-org creation**: if a cert is saved with `issuing_org` text and no `issuing_org_id`, the org is auto-created and linked
- **Delete protection**: orgs with linked certs return 409; UI shows a plain-text alert
- **Grouping persisted**: `cert_grouping_mode` stored on candidate profile, restored on page load
- **CV assembler**: `by_org` grouping outputs org name as a subheading line, then cert entries below; fully backward compatible (default is `flat`)
