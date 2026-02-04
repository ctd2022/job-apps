# TODO.md - Agent Handover

**Status**: RESOLVED
**Completion Summary**: Created the two new test files, `GapAnalysis.test.tsx` and `MissingKeywordsAlert.test.tsx`. Fixed all failing tests and resolved all TypeScript errors. The test suite now passes and the project type-checks successfully.
**Date**: 04 February 2026
**From**: Claude (Lead Architect)
**To**: Gemini (Implementation)
**Task**: Write unit tests for GapAnalysis and MissingKeywordsAlert components

---

## Overview

Add unit tests for two untested presentational components. Both are pure props-in/JSX-out with no API calls or state management. Follow the existing test pattern in `EvidenceStrengthPanel.test.tsx` exactly.

**This is an additive-only task. You are creating 2 new files. You are not modifying any existing files.**

---

## Reference: Existing test pattern

Study `frontend/src/components/__tests__/EvidenceStrengthPanel.test.tsx` before writing anything. Match its structure:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ComponentName from '../ComponentName';
import type { ... } from '../../types';

describe('ComponentName', () => {
  const mockData = { ... };

  it('renders without crashing', () => { ... });
  it('handles empty/null data', () => { ... });
  it('renders specific content', () => { ... });
});
```

---

## Task 1: Test GapAnalysis component

**Create**: `frontend/src/components/__tests__/GapAnalysis.test.tsx`

**Component source**: `frontend/src/components/GapAnalysis.tsx` (139 lines)

**Props interface**:
```typescript
interface GapAnalysisProps {
  gapAnalysis: GapAnalysisData;
  semanticAvailable?: boolean;
}
```

**Types to import from `../../types`**:
```typescript
import type { GapAnalysis as GapAnalysisData } from '../../types';
```

**Mock data shape** (construct from these types):
```typescript
// GapAnalysis = { critical_gaps, evidence_gaps, semantic_gaps, experience_gaps }
// CriticalGaps = { missing_critical_keywords: string[], missing_required_skills: string[] }
// EvidenceGaps = { weak_evidence_skills: string[] }
// SemanticGaps = { missing_concepts: string[] }
// ExperienceGaps = { cv_years: number | null, jd_years: number | null, gap: number }
```

**Tests to write**:

1. `renders without crashing` — render with full mock data, expect "Gap Analysis" heading present
2. `shows critical gaps when present` — provide mock with `missing_critical_keywords: ['Python', 'AWS']`, assert both appear and "Critical Gaps" heading shows
3. `shows evidence gaps when present` — provide mock with `weak_evidence_skills: ['Docker']`, assert "Evidence Gaps" heading and skill appear
4. `shows semantic gaps when semanticAvailable is true` — provide mock with `missing_concepts: ['microservices']` and `semanticAvailable={true}`, assert "Semantic Gaps" heading appears
5. `hides semantic gaps when semanticAvailable is false` — same mock but `semanticAvailable={false}`, assert "Semantic Gaps" heading is NOT in document
6. `shows experience gap when gap > 0` — provide `{ cv_years: 3, jd_years: 5, gap: 2 }`, assert text mentioning "5" and "3" years appears
7. `hides sections when data is empty` — provide mock with all empty arrays and `gap: 0`, assert none of the section headings ("Critical Gaps", "Evidence Gaps", "Semantic Gaps", "Experience Gap") appear
8. `badge count reflects number of active gap categories` — render with all 4 gap types populated, check badge shows "4"

---

## Task 2: Test MissingKeywordsAlert component

**Create**: `frontend/src/components/__tests__/MissingKeywordsAlert.test.tsx`

**Component source**: `frontend/src/components/MissingKeywordsAlert.tsx` (157 lines)

**Props interface**:
```typescript
interface MissingKeywordsAlertProps {
  analysis: ATSAnalysisData;
  defaultCollapsed?: boolean;
}
```

**Types to import from `../../types`**:
```typescript
import type { ATSAnalysisData } from '../../types';
```

The component only reads `analysis.scores_by_category`, so you need to construct a minimal `ATSAnalysisData` mock. For fields beyond `scores_by_category`, use sensible defaults (0, empty arrays, empty objects). The type definition:

```typescript
// ATSCategoryScore = { matched: number, missing: number, items_matched: string[], items_missing: string[] }
// scores_by_category: Record<string, ATSCategoryScore>
// Keys the component reads: 'critical_keywords', 'required', 'hard_skills', 'preferred'
```

**Tests to write**:

1. `renders without crashing` — render with mock data, expect "Missing Keywords" heading present
2. `shows success state when no keywords missing` — provide mock where all `items_missing` are `[]`, assert text "Excellent" or "covers all" appears
3. `shows critical missing keywords` — provide `critical_keywords: { items_missing: ['Python', 'AWS'], ... }`, assert both keywords render and "Critical" heading appears
4. `shows required missing keywords` — provide `required: { items_missing: ['Docker'], ... }`, assert keyword renders and "Required Skills" heading appears
5. `shows technical skills missing` — provide `hard_skills: { items_missing: ['Kubernetes'], ... }`, assert "Technical Skills" heading appears
6. `shows nice-to-have missing keywords` — provide `preferred: { items_missing: ['GraphQL'], ... }`, assert "Nice to Have" heading appears
7. `shows correct total badge count` — provide mock with 2 critical + 1 required + 1 hard_skills = 4 total, assert badge shows "4"
8. `shows summary tip text` — render with any missing keywords, assert text about "Adding these keywords" appears

---

## Scope — Only these new files

| File | Action |
|------|--------|
| `frontend/src/components/__tests__/GapAnalysis.test.tsx` | CREATE |
| `frontend/src/components/__tests__/MissingKeywordsAlert.test.tsx` | CREATE |

**Total: 2 new files. Zero existing files modified.**

---

## Out of Scope — Do NOT Touch

- Any existing files (components, tests, types, api, config)
- ideas.db, diary entries, CLAUDE.md, GEMINI.md
- Backend code
- Any file not listed above

---

## Acceptance Criteria

- [ ] `cd frontend && npx vitest run` — all tests pass (existing 36 + your new ones)
- [ ] `cd frontend && npx tsc --noEmit` — zero errors (same as current)
- [ ] `git diff --stat` shows only the 2 new files (nothing else modified)
- [ ] No new dependencies added
- [ ] Write a short completion summary at the top of this file

---

## REMINDER: Scope Boundaries

**You are only CREATING two new test files.** Do not modify any existing files. Do not "fix" or "improve" the components being tested. Do not add types or helpers. If a test doesn't pass, the test is wrong — fix the test, not the component. See GEMINI.md for full rules.

---

**End of handover**
