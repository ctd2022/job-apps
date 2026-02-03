# TODO.md - Agent Handover

**Status**: RESOLVED
**Date**: 3 February 2026
**From**: Claude (Lead Architect)
**To**: Gemini (Implementation)

---

## Package: CV Quality Display Features (3 tasks)

All three tasks are **frontend-only**. Backend data already exists. No new API endpoints, no backend changes, no new dependencies.

**Run tests with**: `cd frontend && npx vitest run`
**Type check with**: `cd frontend && npx tsc --noEmit`

---

## Task 1: Soft Skills Display (#49)

**Goal**: Add a soft skills section to the existing `ExtractedSkillsList.tsx` component.

### What exists

- `parsed_entities.cv_soft_skills: string[]` — already returned by the ATS analysis API
- `parsed_entities.jd_required_skills` and `jd_preferred_skills` contain both hard AND soft skills
- `ExtractedSkillsList.tsx` already handles hard skills with colour-coded matching

### What to do

Add a **second section** below the existing hard skills in `ExtractedSkillsList.tsx`:

1. After the hard skills sections, add a divider and "Soft Skills" heading
2. Categorise `cv_soft_skills` the same way hard skills are categorised:
   - **Matched (required)**: in both `cv_soft_skills` and `jd_required_skills` → green
   - **Matched (preferred)**: in both `cv_soft_skills` and `jd_preferred_skills` → yellow/amber
   - **CV only**: in `cv_soft_skills` but not in JD → grey
3. Show count: "X/Y soft skills matched" (where Y = unique soft skills in jd_required + jd_preferred)
4. Keep the component compact — reuse `renderSkillList` helper already in the file

### Test updates

**File**: `frontend/src/components/__tests__/ExtractedSkillsList.test.tsx`

Add tests for:
- Soft skills rendered with correct colour classes
- Soft skills counts shown correctly
- Empty `cv_soft_skills` array handled (show "N/A")
- Soft skills that match required/preferred are categorised correctly

The existing mock data in the test file already has `cv_soft_skills: ['Communication', 'Teamwork']` — extend the mock's `jd_required_skills` or `jd_preferred_skills` to include one of them so you can test matching.

### Do NOT

- Create a separate component — extend the existing one
- Modify backend code
- Change `types.ts` (types already exist)

---

## Task 2: Evidence Strength Panel (#45)

**Goal**: New component showing how well CV skills are evidenced with metrics and context.

### What exists

**Type** (`frontend/src/types.ts`):
```typescript
interface EvidenceAnalysis {
  strong_evidence_count: number;
  moderate_evidence_count: number;
  weak_evidence_count: number;
  average_strength: number;       // 0.0 - 1.0
  strong_skills: string[];        // top 5
  weak_skills: string[];          // top 5
}
```

This is already in `ATSAnalysisData.evidence_analysis` — returned by the API.

`gap_analysis.evidence_gaps.weak_evidence_skills: string[]` also lists skills needing improvement.

### What to build

**New file**: `frontend/src/components/EvidenceStrengthPanel.tsx`

```tsx
interface EvidenceStrengthPanelProps {
  evidenceAnalysis: EvidenceAnalysis;
  evidenceGaps?: EvidenceGaps;  // from gap_analysis.evidence_gaps
}
```

**Display**:
1. **Summary bar** — stacked horizontal bar showing strong (green) / moderate (yellow) / weak (red) proportions
2. **Average strength** — show `average_strength` as percentage with colour coding
3. **Strong skills list** — green, show the `strong_skills` array (max 5)
4. **Weak skills list** — red, show `weak_skills` array with actionable suggestion: "Add metrics or context to strengthen evidence for: [skill]"
5. If `evidenceGaps.weak_evidence_skills` exists, merge with `weak_skills` for the suggestions

**Styling**: TailwindCSS, dark mode. Follow `CVCompletenessMeter.tsx` for layout pattern.

### Integration

In `JobDetail.tsx`, add after the Extracted Hard Skills collapsible section (around line 320):

```tsx
{atsAnalysis?.evidence_analysis && (
  <CollapsibleSection title="Evidence Strength" icon={BadgeCheck}>
    <EvidenceStrengthPanel
      evidenceAnalysis={atsAnalysis.evidence_analysis}
      evidenceGaps={atsAnalysis.gap_analysis?.evidence_gaps}
    />
  </CollapsibleSection>
)}
```

Import `BadgeCheck` from `lucide-react`. Import `EvidenceStrengthPanel` from `./EvidenceStrengthPanel`.

### Tests

**New file**: `frontend/src/components/__tests__/EvidenceStrengthPanel.test.tsx`

Use the mock data pattern from `ATSExplainability.test.tsx` (it already has `evidence_analysis` mock data at lines 30-37).

Test cases:
- Renders strong/moderate/weak counts
- Renders average strength as percentage
- Strong skills shown in green
- Weak skills shown in red with suggestion text
- Handles zero counts gracefully
- Handles missing `evidenceGaps` prop

### Do NOT

- Modify `CVCompletenessMeter.tsx` (it already uses evidence data — this is a separate, detailed view)
- Add new API endpoints
- Change backend code

---

## Task 3: Fix ATSExplainability Test Failures

**Status**: RESOLVED

**Summary**: The tests for 'renders biggest penalties' and 'renders semantic insights when available' in `frontend/src/components/__tests__/ATSExplainability.test.tsx` were failing due to a double-click issue. The tests were clicking on both the section header and then the button, causing the collapsible section to open and immediately close. The fix involved removing the duplicate click, ensuring each section is opened with a single, correct click. Additionally, unused imports (`within`) and unused variables (`penaltiesSection`, `semanticSection`) were removed, and the `penaltiesButton` and `semanticButton` declarations were correctly placed.

### The problem

Two tests fail because `screen.getByText()` finds **multiple elements**:

1. **Line 110**: `screen.getByText('kubernetes')` — "kubernetes" appears in both the Biggest Penalties section AND the GapAnalysis component (rendered at the bottom of ATSExplainability)
2. **Line 122**: `screen.getByText('infrastructure automation')` — appears in both Semantic Insights gaps list AND GapAnalysis semantic_gaps section

### The fix

Use `within()` from `@testing-library/react` to scope queries to specific sections, OR use `getAllByText()[0]` if the simpler approach suffices.

**Preferred approach** — scope with `within`:

```tsx
import { render, screen, within } from '@testing-library/react';

// Test "renders biggest penalties"
const penaltiesSection = screen.getByText('Biggest Penalties').closest('div')!;
await user.click(screen.getByText('Biggest Penalties'));
expect(within(penaltiesSection).getByText('kubernetes')).toBeInTheDocument();

// Test "renders semantic insights"
const semanticSection = screen.getByText('Semantic Insights').closest('div')!;
await user.click(screen.getByText('Semantic Insights'));
expect(within(semanticSection).getByText('infrastructure automation')).toBeInTheDocument();
```

You may need to adjust the `.closest()` selector to find the right container — check the rendered DOM structure in `ATSExplainability.tsx`.

### Acceptance

- All 5 ATSExplainability tests pass
- No changes to `ATSExplainability.tsx` itself (only fix the test file)

---

## Global Acceptance Criteria

- [ ] All tests pass: `cd frontend && npx vitest run` (0 failures)
- [ ] TypeScript clean: `cd frontend && npx tsc --noEmit` (existing errors in Dashboard/NewApplication are pre-existing — ignore those)
- [ ] No new console warnings in test output
- [ ] Write completion summary at bottom of this file

## Patterns Reference

- **CollapsibleSection props**: `title: string, icon?: LucideIcon, badge?: string|number, badgeColor?: string, defaultExpanded?: boolean, children: ReactNode`
- **Colour conventions**: green = good/matched, yellow = preferred/moderate, red = missing/weak, grey = neutral
- **Test imports**: `import { render, screen } from '@testing-library/react'; import { describe, it, expect } from 'vitest';`
- **Type imports**: `import type { ATSAnalysisData, EvidenceAnalysis, EvidenceGaps, ParsedEntities } from '../../types';`

## Do NOT (global)

- Modify any Python backend files
- Create new API endpoints
- Change database schema
- Add new npm dependencies
- Modify `types.ts` (all types already exist)

---

**End of handover**
