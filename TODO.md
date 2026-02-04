# TODO.md - Agent Handover

**Gemini Completion Summary:**
Created unit tests for the 7 specified components. All tests pass and there are no TypeScript errors. Each test file was committed individually as requested.

---
**Status**: RESOLVED
**Date**: 04 February 2026
**From**: Claude (Lead Architect)
**To**: Gemini (Implementation)
**Task**: Write unit tests for 7 untested presentational components

---

## Overview

Add unit tests for 7 untested components. All are pure presentational (props-in, JSX-out) with no API calls. Follow the existing test pattern exactly.

**This is an additive-only task. You are creating 7 new test files. You are not modifying any existing files.**

### IMPORTANT: Work in batches

**Complete one test file at a time**, in the order listed below. After each file:

1. Run `cd frontend && npx vitest run` to confirm all tests pass
2. Run `cd frontend && npx tsc --noEmit` to confirm zero TS errors
3. **Commit** the single test file: `git add frontend/src/components/__tests__/<TestFile>.test.tsx && git commit -m "test: Add unit tests for <ComponentName>"`
4. **Pause and wait for user confirmation** before starting the next one

This is an exception to the normal "do not commit" rule — the user has explicitly requested commits between each file.

---

## Reference: Existing test pattern

Study `frontend/src/components/__tests__/EvidenceStrengthPanel.test.tsx` and `GapAnalysis.test.tsx`. Match their structure:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ComponentName from '../ComponentName';
import type { ... } from '../../types';

describe('ComponentName', () => {
  const mockData = { ... };
  it('renders without crashing', () => { ... });
  // ... more tests
});
```

For components that use click interactions, also import:
```typescript
import { fireEvent } from '@testing-library/react';
```

---

## Task 1: CollapsibleSection (53 lines)

**Create**: `frontend/src/components/__tests__/CollapsibleSection.test.tsx`

**Props**:
```typescript
interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}
```

**Tests** (5):
1. `renders title` — render with `title="Test Section"` and children `<p>Content</p>`, assert title visible
2. `children hidden by default` — render without `defaultExpanded`, assert children text NOT visible
3. `children visible when defaultExpanded` — render with `defaultExpanded={true}`, assert children text visible
4. `toggles children on click` — render collapsed, click the button, assert children become visible; click again, assert children hidden
5. `renders badge when provided` — render with `badge={5}`, assert "5" is visible

---

## Task 2: LoadingState (77 lines)

**Create**: `frontend/src/components/__tests__/LoadingState.test.tsx`

Note: This file has multiple exports. Import them as:
```typescript
import LoadingState, { SkeletonCard, SkeletonList, SkeletonStats } from '../LoadingState';
```

**Props for LoadingState**:
```typescript
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}
```

**Tests** (5):
1. `renders default loading message` — render with no props, assert "Loading..." text visible
2. `renders custom message` — render with `message="Please wait"`, assert that text visible
3. `renders fullPage wrapper` — render with `fullPage={true}`, assert container has `min-h-[400px]` class
4. `SkeletonCard renders` — render `<SkeletonCard />`, assert container has `animate-pulse` class
5. `SkeletonList renders correct count` — render `<SkeletonList count={5} />`, assert 5 skeleton cards rendered (look for elements with `animate-pulse` class)

---

## Task 3: ErrorBoundary (98 lines)

**Create**: `frontend/src/components/__tests__/ErrorBoundary.test.tsx`

This is a class component. To test it, create a child component that throws:

```typescript
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
}
```

**Important**: ErrorBoundary logs to `console.error`. Suppress it in tests:
```typescript
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });
```

Import `vi` from vitest: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';`

**Tests** (4):
1. `renders children when no error` — wrap `<ThrowError shouldThrow={false} />` in ErrorBoundary, assert "No error" visible
2. `shows error UI when child throws` — wrap `<ThrowError shouldThrow={true} />`, assert "Something went wrong" visible
3. `shows error message` — after throw, assert "Test error" text is visible
4. `renders custom fallback` — render with `fallback={<div>Custom fallback</div>}` and a throwing child, assert "Custom fallback" visible

---

## Task 4: MatchHistoryTable (94 lines)

**Create**: `frontend/src/components/__tests__/MatchHistoryTable.test.tsx`

**Types**:
```typescript
import type { MatchHistoryEntry } from '../../types';
// MatchHistoryEntry = { id, job_id, cv_version_id, score, matched, total,
//   missing_count, created_at, version_number, change_summary, iteration, delta }
```

**Tests** (5):
1. `returns null when history has 0 entries` — render with `history=[]`, assert container is empty
2. `returns null when history has 1 entry` — render with single entry, assert container is empty (component only renders for 2+ entries)
3. `renders table with multiple entries` — provide 2 entries, assert "Match History (2 iterations)" text visible
4. `shows score with percent` — provide entry with `score: 75`, assert "75%" visible
5. `shows positive delta in green` — provide entry with `delta: 5`, assert "+5" text visible

---

## Task 5: ScoreComparisonPanel (119 lines)

**Create**: `frontend/src/components/__tests__/ScoreComparisonPanel.test.tsx`

**Types**:
```typescript
import type { ATSComparisonData } from '../../types';
// ATSComparisonData = { oldScore, newScore, delta, categories: CategoryComparison[],
//   keywordsAddressed: string[], keywordsStillMissing: string[] }
// CategoryComparison = { category, oldMatched, oldMissing, newMatched, newMissing, delta,
//   keywordsNowMatched, keywordsStillMissing, keywordsNewlyMissing }
```

**Tests** (5):
1. `renders without crashing` — render with mock data, assert "Score Comparison" title visible
2. `shows positive delta badge` — provide `delta: 8`, assert "+8" visible
3. `shows keywords now matched` — provide `keywordsAddressed: ['Python', 'AWS']`, assert both visible and "Keywords Now Matched (2)" heading visible
4. `shows keywords still missing` — provide `keywordsStillMissing: ['Docker']`, assert "Still Missing (1)" heading visible
5. `shows category labels` — provide category with `category: 'critical_keywords'`, assert "Critical Keywords" text visible

---

## Task 6: MatchExplanationCard (168 lines)

**Create**: `frontend/src/components/__tests__/MatchExplanationCard.test.tsx`

**Types**: Same `ATSAnalysisData` mock as `MissingKeywordsAlert.test.tsx`. You can use a similar mock structure — copy the pattern from that file.

The component reads: `analysis.hybrid_scoring`, `analysis.semantic_analysis`, `analysis.matched_keywords`, `analysis.missing_keywords`.

**Tests** (5):
1. `renders without crashing` — render with mock, assert "Match Explanation" title visible
2. `shows final score badge` — provide `hybrid_scoring.final_score: 72`, assert "72%" visible in badge
3. `shows score composition heading` — assert "Score Composition" text visible
4. `shows matched keywords` — provide `matched_keywords: ['Python', 'React']`, assert "Top Matched Keywords" heading and both keywords visible
5. `shows lexical legend` — assert text containing "Lexical" is visible in the legend

---

## Task 7: CVCompletenessMeter (211 lines)

**Create**: `frontend/src/components/__tests__/CVCompletenessMeter.test.tsx`

**Types**: Same `ATSAnalysisData` mock as above. The component reads: `analysis.section_analysis`, `analysis.evidence_analysis`, `analysis.parsed_entities`.

**Tests** (6):
1. `renders without crashing` — render with mock, assert "CV Completeness" title visible
2. `shows completeness percentage` — provide mock where skills detected (cv_hard_skills has items), assert badge shows expected percentage
3. `shows section checklist` — assert "Section Checklist" heading visible
4. `shows detected sections with checkmark` — provide mock with hard skills, assert "Skills Section" visible
5. `shows suggestions for missing sections` — provide mock with no projects (projects_matches empty), assert "Suggestions" heading visible
6. `shows hard skills count` — provide `cv_hard_skills: ['Python', 'AWS', 'React']`, assert "3" visible and "Hard Skills Found" text visible

---

## Scope — Only new test files

| # | File | Action |
|---|------|--------|
| 1 | `frontend/src/components/__tests__/CollapsibleSection.test.tsx` | CREATE |
| 2 | `frontend/src/components/__tests__/LoadingState.test.tsx` | CREATE |
| 3 | `frontend/src/components/__tests__/ErrorBoundary.test.tsx` | CREATE |
| 4 | `frontend/src/components/__tests__/MatchHistoryTable.test.tsx` | CREATE |
| 5 | `frontend/src/components/__tests__/ScoreComparisonPanel.test.tsx` | CREATE |
| 6 | `frontend/src/components/__tests__/MatchExplanationCard.test.tsx` | CREATE |
| 7 | `frontend/src/components/__tests__/CVCompletenessMeter.test.tsx` | CREATE |

**Total: 7 new files. Zero existing files modified.**

---

## Out of Scope — Do NOT Touch

- Any existing files (components, tests, types, api, config)
- ideas.db, diary entries, CLAUDE.md, GEMINI.md
- Backend code
- `PipelineDiagnosis.tsx` and `FilePreview.tsx` (these need API mocking — excluded deliberately)

---

## Acceptance Criteria (per file)

- [ ] `cd frontend && npx vitest run` — all tests pass
- [ ] `cd frontend && npx tsc --noEmit` — zero errors
- [ ] Test file committed individually
- [ ] Paused for user confirmation before starting next file

## Final Acceptance Criteria

- [ ] All 7 test files created and committed
- [ ] `git diff --stat` shows no uncommitted changes to existing files
- [ ] Write a short completion summary at the top of this file

---

## REMINDER: Scope Boundaries

**You are only CREATING new test files.** Do not modify any existing files. Do not "fix" or "improve" the components being tested. If a test doesn't pass, the test is wrong — fix the test, not the component. See GEMINI.md for full rules.

---

**End of handover**
