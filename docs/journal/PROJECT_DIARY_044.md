# Project Diary 044 - CV Keyword Injection: Debugging, Highlighting & LLM Reliability

**Date**: 25 February 2026
**Focus**: Fix "Apply Selected" keyword injection — visual feedback, LLM hallucination, backend reliability
**Status**: COMPLETE

---

## Quick Resume

> **Read this first when returning to the project after a break.**

- **Branch**: `main`
- **Track**: Bug fix / UX polish — CV keyword injection (Improve CV panel)
- **Last session**: Fixed the entire Apply Selected workflow: the LLM was silently returning unchanged CVs; added highlighted diff view, keyword verification, and improved prompt. Confirmed Gemini works (4/5); local Ollama (llama3.1:8b) does not.
- **Next steps**: Pick next item from ideas backlog
- **Blocked/broken**: Nothing
- **Ideas backlog**: Nothing outstanding at high priority

---

## What Was Done

### The Problem

The "Apply Selected" button in the CV Editor's "Improve CV" panel appeared to work (spinner ran, "Incorporating keywords" message showed) but the CV text didn't visibly change. Users had no way to confirm keywords were actually injected.

Investigation revealed **two independent bugs**:

#### Bug 1: LLM silently returning unchanged CV

Testing the `/api/jobs/{id}/apply-suggestions` endpoint directly confirmed that the local Ollama model (llama3.1:8b) was returning the **exact original CV** (8,453 chars in, 8,453 chars out) while generating a plausible-sounding but entirely fabricated changelog:

```
- Added "Trade Lifecycle" to Core Skills section   ← LIE
- Strengthened "stakeholder engagement" mention    ← LIE
```

Root cause: the old prompt contained `"- If a keyword cannot be placed naturally, SKIP it"`. The small local model interpreted this as blanket permission to skip everything, then invented a changelog to appear compliant.

**Fix** (`src/ats_optimizer.py` — `incorporate_keywords` prompt):
- Removed the "SKIP it" escape hatch entirely
- Added: `"EVERY keyword in the list MUST appear somewhere in the output CV"`
- Added explicit fallback: `"If no natural context exists, add the keyword to the Core Skills section — skills sections are always valid placement for domain keywords"`
- Changed changelog example to show skills-section additions (not just skips)

#### Bug 2: Highlighted view used exact string matching

The highlight view searched for keyword phrases verbatim in the revised text. If the LLM rephrased, used different capitalisation, or embedded the keyword in a longer term, nothing highlighted.

**Fix** (`frontend/src/components/CVTextEditor.tsx`):
- Replaced exact-match approach with a **line-level diff**: snapshot the pre-apply content, compare line-by-line with the revised content after the API returns, and highlight any line that didn't exist in the original
- Within changed lines, keywords are still bolded (as a secondary signal)
- This works regardless of how the LLM phrases the insertion

### New Feature: Keyword Verification Panel

Added a verification panel that independently checks whether each selected keyword actually appears in the revised CV text (case-insensitive substring match). This is computed client-side from the returned text — it does not trust the LLM's changelog.

Shows per-keyword status:
- `✓ Programme governance and delivery` — newly added
- `✗ Agile methodology` — *not added by LLM* (strikethrough)
- `~ Trade lifecycle` — *already present in original*

The LLM changelog is still shown but now labelled "LLM changelog (may contain inaccuracies)" to set correct expectations.

### LLM Backend Findings

| Backend | Result |
|---------|--------|
| Ollama llama3.1:8b (local) | **Fails** — returns unchanged CV, fabricates changelog. Tried with both old and new prompt. |
| Gemini 2.0 Flash (cloud) | **Works** — 4/5 keywords verified as actually added |

**This is a capability floor issue**, not a prompt issue. The 8B parameter model is too small to reliably follow complex editing instructions (preserve content, insert keyword, don't fabricate, output full revised CV + changelog). Larger models may perform better but haven't been tested.

---

## Files Changed

| File | Change |
|------|--------|
| `src/ats_optimizer.py` | `incorporate_keywords` prompt: removed SKIP escape hatch, made keywords mandatory with Core Skills fallback |
| `frontend/src/components/CVTextEditor.tsx` | Highlighted diff view (line-level diff), keyword verification panel, pre-apply content snapshot |

---

## Key Lessons

1. **Always verify LLM output against ground truth** — don't trust the model's self-reported changelog. Our keyword verification panel does this client-side.

2. **Local small models (≤8B) are unreliable for structured editing tasks** — they can follow simple instructions but fail at multi-constraint tasks like "preserve all content + insert keyword + don't fabricate + output full document + write changelog". Use Gemini or a larger model for `apply-suggestions`.

3. **Line-diff is more robust than keyword search for highlighting** — the diff detects actual changes regardless of phrasing; keyword search is a secondary decoration on top.

4. **LLM hallucination in changelogs is silent and convincing** — without verification, users would have believed the keywords were injected when they weren't. This could have led to submitting CVs without the intended keywords.
