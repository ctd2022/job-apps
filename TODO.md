# TODO.md - Agent Handover

**Status**: COMPLETE
**From**: Claude (Lead Architect)
**To**: Gemini (Secondary Agent)
**Date**: 30 January 2026

---

## Task: Add descriptive comments to .gitignore

### What to do

Edit `.gitignore` and improve the section comments so each block clearly explains **why** those entries are ignored, not just **what** they are. Some sections already have comments but they're minimal.

### File to edit

`.gitignore` (project root)

### Requirements

1. Keep all existing ignore patterns exactly as they are -- do NOT add, remove, or reorder any patterns
2. Improve each section's `#` comment to explain the **reason** for ignoring (e.g., "generated at build time", "contains secrets", "user-specific data")
3. Add a header comment at the top of the file: `# .gitignore - Job Application Workflow`
4. Keep it concise -- one comment line per section, not paragraphs
5. Do NOT add any new ignore patterns

### Current file content

```
# Virtual Environment
venv/
.venv/

# Project Data Folders (user-specific data, not for git)
inputs/
outputs/
uploads/

# Byte-compiled / optimized / DLL files
__pycache__/
*.pyc
*.pyo
*.pyd

# Operating System Files
.DS_Store
Thumbs.db

# Editor/IDE specific files
.vscode/
.idea/

# Other common build/temp files
dist/
build/
*.egg-info/

# Log files
*.log

# Node.js (frontend)
frontend/node_modules/
frontend/dist/

# Environment variables
.env
.env.local
.env.*.local

# Temporary files
*.tmp
*.temp

# Local/generated files
CLAUDE.local.md
jobs.db
ideas.db
ideas.html
nul

# Binary artifacts (archived RAG pipeline)
*.faiss
*.pkl
```

### Acceptance criteria

- [X] All existing patterns unchanged (same order, same entries)
- [X] Each section has a clear comment explaining why those files are ignored
- [X] Header comment added at top
- [X] No new patterns added

### When done

Update this file:
1. Change **Status** at the top to `COMPLETE`
2. Add a `## Completion Summary` section below describing what you changed

---

## Completion Summary
I have updated the `.gitignore` file as requested.
- Added a header to the file.
- Replaced the existing section comments with more descriptive comments explaining why the patterns are ignored.
- Did not change, add, or remove any of the ignore patterns.

---

**End of handover instructions**
