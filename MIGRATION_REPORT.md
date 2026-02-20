# Migration Readiness Report: job_applications

**Current Location**: `C:\Users\davidgp2022\My Drive\Kaizen\job_applications`
**Target Location**: TBD (new programme hierarchy)
**Review Date**: 2026-01-30
**Reviewed By**: Claude (Opus 4.5)

## Summary

- **Migration Complexity**: **Low**
- **Blocking Issues**: 1
- **Items Requiring Updates**: 6
- **Items Confirmed Safe**: 12

The project is well-architected for portability. Backend code consistently uses `Path(__file__).parent.parent` for path resolution. No external/sibling project dependencies exist. The main concerns are documentation with hardcoded paths and one `Path(".")` usage in the workflow module.

---

## Blocking Issues

### 1. CWD-dependent path in workflow module

- **File**: `src/job_application_workflow.py:45`
- **Current value**: `self.base_dir = Path(".")`
- **Problem**: Assumes current working directory is project root. Breaks when the workflow is invoked from a different directory or by a different entry point.
- **Required action**: Replace with `Path(__file__).parent.parent` to match the pattern used everywhere else in the codebase.

---

## Required Updates

### Hardcoded Paths in Documentation

| File | Lines | Current Value | Recommended Change |
|------|-------|---------------|-------------------|
| `CLAUDE.md` | 19-20 | `cd "C:/Users/davidgp2022/My Drive/Kaizen/job_applications"` | Use relative path or placeholder `cd <project-root>` |
| `CLAUDE.local.md` | multiple | llama-server path, models dir, project path | Update after migration (gitignored, no repo impact) |
| `docs/guides/CV_JSON_QUICKSTART.md` | 30, 154 | Hardcoded `cd` commands | Update to relative/placeholder paths |
| `QUICKSTART.md` | 14, 196, 328 | Example commands with absolute paths | Update to relative/placeholder paths |
| `MASTER_VISION.md` | 380, 389, 396 | Example commands | Update to relative/placeholder paths |
| `docs/journal/PROJECT_DIARY_*.md` | various | Historical paths in diary entries | Low priority - historical record |

### Configuration Files

| File | Setting | Current Value | Recommended Change |
|------|---------|---------------|-------------------|
| `.claude/settings.local.json` | Multiple paths | Hardcoded Windows paths (venv, llama-server, models) | Regenerate after migration (gitignored) |
| `.env` | `GEMINI_API_KEY` | Contains API key | Recreate at destination (gitignored) |

### Generated Artifacts

| File | Issue | Recommended Change |
|------|-------|-------------------|
| `outputs/*/metadata.json` (36+ files) | `job_description` field stores absolute path | Fix in `backend/main.py:507` to store relative path |

### Local Dependencies

| Dependency | Current Path | Recommendation |
|------------|--------------|----------------|
| None found | N/A | No local/path dependencies in package.json or Python config |

---

## No Changes Required (Confirmed Safe)

- [x] **Backend path resolution** - All use `Path(__file__).parent.parent` pattern
- [x] **Database paths** - `jobs.db` and `ideas.db` resolved relative to script location
- [x] **Frontend API calls** - Uses relative `/api` base URL
- [x] **Vite proxy config** - `localhost:8000` is environment-agnostic
- [x] **CORS origins** - `localhost` references work on any machine
- [x] **npm dependencies** - All from registry, no local `file:` or `link:` deps
- [x] **Python imports** - `sys.path.insert` uses `__file__`-relative paths
- [x] **Directory auto-creation** - `inputs/`, `outputs/`, `uploads/` created at startup
- [x] **TypeScript config** - No hardcoded paths in tsconfig.json
- [x] **Tailwind/PostCSS** - No hardcoded paths
- [x] **No CI/CD pipelines** - Nothing to update
- [x] **No Docker/containers** - No volume mounts to update
- [x] **No git submodules** - No `.gitmodules` file
- [x] **No symlinks** - None found
- [x] **Workspace file** - Uses relative `"path": "."` only

---

## Post-Migration Checklist

After moving the project:

- [ ] Fix `src/job_application_workflow.py:45` - replace `Path(".")` with `Path(__file__).parent.parent`
- [ ] Update `CLAUDE.md` path examples (2 instances)
- [ ] Update `CLAUDE.local.md` with new machine paths
- [ ] Recreate `.env` with API keys
- [ ] Regenerate `.claude/settings.local.json` (will happen automatically on first Claude Code use)
- [ ] Update `docs/guides/CV_JSON_QUICKSTART.md` path examples
- [ ] Update `QUICKSTART.md` path examples
- [ ] Run `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000` to verify backend starts
- [ ] Run `cd frontend && npm install && npm run dev` to verify frontend starts
- [ ] Run `cd frontend && npx tsc --noEmit` to verify TypeScript compiles
- [ ] Verify `curl http://localhost:8000/api/health` returns success

---

## Recommendations

1. **Fix the one code issue now** - Change `Path(".")` to `Path(__file__).parent.parent` in `job_application_workflow.py` before migration. This is the only actual code change needed.

2. **Use placeholders in docs** - Replace hardcoded user paths in documentation with `<project-root>` or instruct users to `cd` to the project directory without specifying where it is.

3. **Store relative paths in metadata** - Modify `backend/main.py:507` to store `Path(job_desc_path).name` instead of `str(job_desc_path)` in output metadata, making generated artifacts portable.

4. **Add a `requirements.txt`** - No Python dependency manifest was found. Adding one would make migration to a new environment smoother (currently dependencies are implicit).

5. **Consider environment variable for project root** - While `Path(__file__)` works well, a `PROJECT_ROOT` env var would provide an additional override mechanism for non-standard deployments.
