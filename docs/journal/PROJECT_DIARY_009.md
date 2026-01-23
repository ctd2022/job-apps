# Project Diary - Entry 009: Track 2 Week 3 Complete

**Date**: 23 January 2026
**LLM Used**: Claude Opus 4.5 (via Claude Code)
**Status**: Track 2 Week 3 COMPLETE
**Achievement**: File preview, error boundaries, all three backends tested

---

## What We Accomplished Today

### Goal: Complete Track 2 Week 3 (Polish & Testing)

Finished all remaining tasks for Track 2 Week 3:
- File preview with markdown rendering
- Error boundaries and loading states
- Tested all three backends (Ollama, Llama.cpp, Gemini)

---

### 1. File Preview in Browser

#### Backend Changes (`backend/main.py`)

Added new endpoint for fetching file content:
```python
@app.get("/api/jobs/{job_id}/files/{filename}/content")
async def get_file_content(job_id: str, filename: str):
    """Get the text content of a file for preview (supports .md, .txt, .json)"""
```

#### Frontend Changes

**New Component: `FilePreview.tsx`**
- Clickable tabs for each previewable file (CV, Cover Letter, ATS Analysis)
- Markdown rendering with `react-markdown` and `@tailwindcss/typography`
- JSON formatting for metadata files
- Plain text display for .txt files
- Download-only links for DOCX files (binary, can't preview)

**API Client (`api.ts`)**
```typescript
export async function getJobFileContent(jobId: string, fileName: string): Promise<FileContent>
```

**Dependencies Added:**
- `react-markdown` - Markdown rendering
- `@tailwindcss/typography` - Prose styling for rendered markdown

---

### 2. Error Boundaries and Loading States

#### New Components

**`ErrorBoundary.tsx`**
- Class component that catches React errors
- Displays friendly error message with "Try Again" and "Go Home" buttons
- Wraps all routes in App.tsx

**`LoadingState.tsx`**
- Reusable loading spinner with customizable size/message
- Skeleton components: `SkeletonCard`, `SkeletonList`, `SkeletonStats`
- Animated placeholder cards during data loading

#### Updated Components

| Component | Changes |
|-----------|---------|
| `App.tsx` | Wrapped routes with ErrorBoundary |
| `Dashboard.tsx` | Skeleton loading, retry button on errors |
| `ApplicationHistory.tsx` | Skeleton loading, retry button on errors |

---

### 3. Backend Testing - All Three Backends

#### Ollama
- **Status**: Working
- **Model**: llama3.1:8b
- **Notes**: No issues

#### Gemini
- **Status**: Working (after fixes)
- **Model**: gemini-2.0-flash (updated from deprecated gemini-1.5-pro)
- **Issues Fixed**:
  - Old model names (gemini-1.5-pro, gemini-1.5-flash) no longer exist
  - Updated defaults in: `llm_backend.py`, `job_application_workflow.py`, `backend/main.py`
  - Fixed emoji encoding error in rate limiter

#### Llama.cpp
- **Status**: Working
- **Model**: Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf
- **Notes**:
  - Gemma-3-27B too large for GPU VRAM
  - Used smaller 8B model successfully
  - Server: `C:\Users\davidgp2022\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe`
  - Models directory: `C:\Users\davidgp2022\models\`

---

### 4. Environment Configuration

#### Created `.env` File
```
# API Keys for Job Application Workflow
GEMINI_API_KEY=AIzaSy...
```

#### Updated Backend to Load `.env`
```python
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")
```

---

### 5. Bug Fixes

#### Gemini Model Names (404 Errors)
**Problem**: `gemini-1.5-pro` and `gemini-1.5-flash` no longer exist in Gemini API
**Solution**: Updated to `gemini-2.0-flash` (default), `gemini-2.5-flash`, `gemini-2.5-pro`

**Files Updated**:
- `src/llm_backend.py` - Default model and factory
- `src/job_application_workflow.py` - Default model
- `backend/main.py` - Default model and UI model list

#### Emoji Encoding Errors (Windows cp1252)
**Problem**: Rate limiter in `llm_backend.py` used hourglass emoji, crashed on Windows
**Solution**: Replaced all emojis with text labels

| Before | After |
|--------|-------|
| `⏳` | `[WAIT]` |
| `🧪` | `[TEST]` |
| `✅` | `[OK]` |
| `❌` | `[FAIL]` |

---

### 6. Files Modified

| File | Changes |
|------|---------|
| `backend/main.py` | +file content endpoint, +dotenv loading, updated Gemini models |
| `frontend/src/api.ts` | +getJobFileContent, +FileContent type |
| `frontend/src/components/FilePreview.tsx` | NEW - file preview with markdown |
| `frontend/src/components/ErrorBoundary.tsx` | NEW - error boundary |
| `frontend/src/components/LoadingState.tsx` | NEW - loading states & skeletons |
| `frontend/src/components/NewApplication.tsx` | Use FilePreview component |
| `frontend/src/components/Dashboard.tsx` | Skeleton loading, retry button |
| `frontend/src/components/ApplicationHistory.tsx` | Skeleton loading, retry button |
| `frontend/src/App.tsx` | Wrap with ErrorBoundary |
| `frontend/tailwind.config.js` | Add typography plugin |
| `frontend/package.json` | +react-markdown, +@tailwindcss/typography |
| `src/llm_backend.py` | Updated Gemini model, fixed emojis |
| `src/job_application_workflow.py` | Updated Gemini default |
| `.env` | NEW - API keys |
| `CLAUDE.md` | Updated status |

---

## Future Enhancement: Llama.cpp Model Selection

**Noted for later**: Currently llama.cpp doesn't have a model dropdown like Ollama/Gemini. To add this:

1. Add config for models directory path
2. Backend endpoint to list `.gguf` files
3. Frontend dropdown for llama.cpp models
4. Note: Changing models requires restarting llama.cpp server (unlike Ollama)

**Models available** (`C:\Users\davidgp2022\models\`):
- gemma-3-27b-it-q4_k_m.gguf (too large for GPU)
- Meta-Llama-3.1-8B-Instruct-Q5_K_M.gguf
- Mistral-Small-Instruct-2409-Q3_K_M.gguf
- Qwen2.5-14B-Instruct-Q4_K_M.gguf
- Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf

---

## Track 2 Week 3 - COMPLETE

| Task | Status |
|------|--------|
| WebSocket integration | COMPLETE (Entry 008) |
| File preview in browser | COMPLETE |
| Error boundaries and loading states | COMPLETE |
| Test all three backends | COMPLETE |

---

## Track 2 Summary - COMPLETE

| Week | Focus | Status |
|------|-------|--------|
| Week 1 | FastAPI Backend | COMPLETE |
| Week 2 | React Frontend | COMPLETE |
| Week 3 | Polish & WebSockets | COMPLETE |

**Track 2 is now production-ready for local use.**

---

## Next Steps

### Immediate
- [ ] Use web UI for real job applications (validation phase)
- [ ] Track success metrics (interviews, offers)

### Short-term Enhancements
- [ ] Llama.cpp model selection dropdown
- [ ] SQLite for persistent job history (currently in-memory)
- [ ] Profile management features

### Medium-term
- [ ] Validate with 20+ real applications
- [ ] Decide: Continue local-only OR proceed to Track 3 (SaaS)?

---

## Session Statistics

- **Time invested**: ~2 hours
- **Files created**: 4 (FilePreview, ErrorBoundary, LoadingState, .env)
- **Files modified**: 12
- **Backends tested**: 3/3
- **Bugs fixed**: 3 (Gemini models, emoji encoding, Python cache)

---

## Key Learnings

### 1. Gemini API Model Evolution
Google regularly deprecates old model names. Always check available models via:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"
```

### 2. Python Bytecode Cache
When fixing bugs in Python files, remember to clear `__pycache__/` directories. Uvicorn's `--reload` doesn't always pick up changes in imported modules.

### 3. GPU VRAM Limitations
Large models (27B+) may not fit in GPU memory. Always have a fallback to smaller models or CPU offloading.

---

## Quote of the Session

> "Track 2 complete. Three backends, real-time updates, file preview, error handling - it's a proper application now."

---

**Track 2: COMPLETE**
**Next Phase**: Validation with real job applications

---

**End of Entry 009**
