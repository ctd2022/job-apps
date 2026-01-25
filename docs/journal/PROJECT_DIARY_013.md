# Project Diary 013 - Track 2.7: UI Improvements Bundle

**Date**: 25 January 2026
**Focus**: Dark Mode + Paste Job Description

---

## Summary

Implemented two UI improvements from the ideas backlog:
- **#8 Dark Mode** (Priority 2) - Full dark theme support
- **#42 Paste Job Description** (Priority 4) - Direct text input option

---

## Features Implemented

### Dark Mode (#8)

**Approach**: Class-based Tailwind dark mode with localStorage persistence.

**Changes**:
- `tailwind.config.js`: Added `darkMode: 'class'`
- `index.css`: Dark body styles
- `api.ts`: Theme utilities (`getTheme`, `setTheme`, `initTheme`)
- `App.tsx`: Theme state, Moon/Sun toggle button in header
- All components updated with `dark:` class variants

**Behavior**:
- System preference used as initial default
- Toggle persists to localStorage
- Smooth transition between themes

### Paste Job Description (#42)

**Approach**: Upload/Paste toggle mirroring CV section pattern.

**Changes**:
- `NewApplication.tsx`: Added `jobDescMode` and `jobDescText` state
- Toggle buttons (Upload/Paste) next to Job Description label
- Textarea for paste mode
- Converts pasted text to File blob on submission (no backend changes needed)

---

## Files Modified

- `frontend/tailwind.config.js`
- `frontend/src/index.css`
- `frontend/src/api.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/NewApplication.tsx`
- `frontend/src/components/Dashboard.tsx`
- `frontend/src/components/ApplicationHistory.tsx`
- `frontend/src/components/JobDetail.tsx`
- `frontend/src/components/FilePreview.tsx`
- `CLAUDE.md`
- `MASTER_VISION.md`

---

## Bug Fix

**Issue**: Default CV not appearing for David profile after multi-user migration.

**Cause**: Existing CVs had `user_id='default'` but David's profile has a different ID.

**Fix**: Migrated CV to David's user_id and set as default.

---

## Ideas Status

```
#8  Dark Mode              -> Done
#42 Paste Job Description  -> Done
```

---

## CLAUDE.md Optimization

Restructured per Anthropic best practices (https://www.anthropic.com/engineering/claude-code-best-practices):

- **Reduced from ~470 to ~110 lines** - concise and actionable
- Added "IMPORTANT" / "YOU MUST" emphasis markers for critical rules
- Moved API reference to `docs/API.md`
- Moved architecture details to `docs/ARCHITECTURE.md`
- Created `CLAUDE.local.md` for personal config (gitignored)
- Kept essential: commands, workflows, code style, troubleshooting

---

## Next Steps

- Continue validation phase with real job applications
- Track success metrics
