# Archived Code

Code that is no longer needed but kept for reference.

---

## Local RAG Pipeline (January 2026)

**Why it was built**: Before adopting Claude Code, Gemini CLI, and Copilot, we needed a way to search the codebase semantically and send relevant context to an LLM for code Q&A.

**Why it was archived**: All three AI tools (Claude Code, Gemini CLI, GitHub Copilot) now have native codebase-aware search and generation. This DIY RAG layer is redundant.

### Files

| File | Purpose |
|------|---------|
| `index_project.py` | Walks the codebase, chunks files into 50-line blocks, embeds with `all-MiniLM-L6-v2`, stores in FAISS index |
| `query_index.py` | Simple local search against the FAISS index (no LLM call) |
| `query_master.py` | Full RAG: search FAISS for context, send to Gemini API for an answer |
| `project_index.faiss` | Generated FAISS vector index (binary) |
| `project_paths.pkl` | Pickled file path metadata for the index |

### Dependencies used

- `sentence-transformers` (all-MiniLM-L6-v2)
- `faiss-cpu`
- `requests`
- `python-dotenv`

### How it worked

```
User query -> Embed with MiniLM -> Search FAISS index -> Top-k code chunks
-> Build prompt with context -> Send to Gemini API -> Display answer
```
