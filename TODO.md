# TODO.md - Agent Handover

**Status**: COMPLETE
**Date**: 05 February 2026
**Task**: ATS Formatting Tips - Inline Guidance (Idea #123)
**Completed by**: Gemini + Claude (bug fix)
**Output**: `FormattingTipsPanel.tsx` created, integrated into CVTextEditor
**Bug fixed**: Escaped newlines `'\\n'` → `'\n'` in regex patterns

---

## Task Overview

Add a tips panel to the CV editor that analyzes content and shows inline formatting suggestions to help users write ATS-friendly CVs. This is **client-side only** - no backend changes.

---

## Deliverables

### 1. Create `FormattingTipsPanel.tsx`

**Path**: `frontend/src/components/FormattingTipsPanel.tsx`

A component that takes CV content and returns formatting tips.

```typescript
interface FormattingTip {
  id: string;
  severity: 'warning' | 'info';
  message: string;
  details?: string;
}

interface FormattingTipsPanelProps {
  content: string;
}
```

### 2. Implement Detection Rules

Analyze the `content` string and return relevant tips. Rules to implement:

| Rule ID | Severity | Condition | Message |
|---------|----------|-----------|---------|
| `no-tables` | warning | Content contains `|` patterns suggesting markdown tables | "Tables may not parse correctly in ATS systems" |
| `no-columns` | warning | Content has tab-separated columns or excessive whitespace alignment | "Multi-column layouts can confuse ATS parsers" |
| `standard-headings` | info | Missing common headings: Experience, Education, Skills | "Consider using standard section headings: Experience, Education, Skills" |
| `has-contact` | warning | No email pattern found (`@`) | "No email address detected - ensure contact info is included" |
| `has-dates` | info | No date patterns (YYYY, MM/YYYY) found | "Add dates to your experience entries for better parsing" |
| `bullet-points` | info | Long paragraphs (>300 chars without line breaks) detected | "Consider using bullet points instead of long paragraphs" |
| `cv-length` | warning | Content < 500 chars | "CV seems short - ATS may flag incomplete applications" |
| `cv-length` | info | Content > 8000 chars | "CV is quite long - consider condensing to 2 pages" |

### 3. UI Design

```
┌─────────────────────────────────────────┐
│ 💡 Formatting Tips (3)           [Hide] │
├─────────────────────────────────────────┤
│ ⚠ Tables may not parse correctly...     │
│ ℹ Consider using standard section...    │
│ ℹ Add dates to your experience...       │
└─────────────────────────────────────────┘
```

- Collapsible panel (default expanded if tips exist)
- Warning icon (⚠) for `warning` severity, info icon (ℹ) for `info`
- Yellow/amber background for warnings, blue/slate for info
- Show count in header: "Formatting Tips (3)"
- "Hide" button to collapse

### 4. Integrate into CVTextEditor

**File**: `frontend/src/components/CVTextEditor.tsx`

Add the panel below the textarea (around line 372, after the `</textarea>`):

```tsx
import FormattingTipsPanel from './FormattingTipsPanel';

// In the render, after the textarea:
<FormattingTipsPanel content={content} />
```

---

## Implementation Notes

### Pattern Examples

```typescript
// Email detection
const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content);

// Date detection
const hasDate = /\b(19|20)\d{2}\b|(\d{1,2}\/\d{4})/.test(content);

// Table detection (markdown pipes)
const hasTable = /\|.*\|.*\|/.test(content);

// Long paragraph detection
const paragraphs = content.split(/\n\s*\n/);
const hasLongParagraph = paragraphs.some(p => p.length > 300 && !p.includes('\n'));
```

### Styling

Use existing Tailwind patterns from the codebase:
- Warning: `bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300`
- Info: `bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300`

Import icons from lucide-react: `AlertTriangle`, `Info`, `Lightbulb`, `ChevronDown`, `ChevronUp`

---

## Files to Modify

| File | Action |
|------|--------|
| `frontend/src/components/FormattingTipsPanel.tsx` | CREATE |
| `frontend/src/components/CVTextEditor.tsx` | MODIFY (add import + component) |

---

## Testing

After implementation:
1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd frontend && npx vitest run` — all tests pass
3. Manual test: Open CV editor, paste content with issues, verify tips appear

### Manual Test Cases

1. Paste CV with `|table|columns|` — should show table warning
2. Paste CV without email — should show contact warning
3. Paste CV without dates — should show dates info tip
4. Paste very short CV (<500 chars) — should show length warning
5. Paste well-formatted CV — should show no tips (or minimal)

---

## Scope Boundaries

**DO:**
- Create the new component
- Add simple regex-based detection rules
- Integrate into CVTextEditor
- Follow existing code patterns

**DO NOT:**
- Modify backend code
- Add new dependencies
- Create tests (optional stretch goal only)
- Change other components

---

## Reference Files

- `frontend/src/components/CVTextEditor.tsx` — integration point
- `frontend/src/components/CollapsibleSection.tsx` — collapsible pattern
- `frontend/src/components/MissingKeywordsAlert.tsx` — similar alert styling

---

## Acceptance Criteria

- [ ] `FormattingTipsPanel.tsx` created with all 8 rules
- [ ] Integrated into CVTextEditor below textarea
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` passes (no regressions)
- [ ] Manual testing confirms tips appear correctly
- [ ] Write completion summary at top of this file

---

**End of handover**
