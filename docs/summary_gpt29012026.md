Project Query / LLM Testing Summary – 28 Jan 2026
1. Objective

Test local project query system using FAISS + embeddings.

Verify Gemini can read indexed project content and provide accurate context-aware answers.

Set up structure for future multi-LLM chaining (Claude → Gemini → Copilot).

2. Files and Setup

query_master.py: main interactive query script

index_project.py: generated FAISS index for project files

project_index.faiss: FAISS index file

project_paths.pkl: mapping of chunks to file paths

Embedding model: all-MiniLM-L6-v2

GEMINI_API_KEY loaded from .env

Claude code commented out, ready for reintegration later

3. Modifications to query_master.py

Removed Claude call; kept Gemini call as primary LLM

Added [GEMINI_MARKER] in prompt to verify Gemini usage

Included raw response preview (first 200 chars) for verification

Added robust input loop with exit/quit commands

Logging for Gemini failures and API rate-limiting

4. Test Queries & Responses
Query	Gemini Response Summary	Notes
latest diary	Summarized PROJECT_DIARY_012 – multi-user support, isolated jobs/CVs, API headers, frontend updates	Shows Gemini is reading project context
function to save user data	Returned createUser(name) TypeScript snippet from api.ts	Correct file, correct code
what does [GEMINI_MARKER] do in my project?	Explained marker is not in project, inserted for Gemini context parsing	Marker validation working
Track 2.9.1 Quick Wins UX features	Summarized three UX improvements: tier labels, privacy messaging, JD auto-save	Shows context spanning multiple files
multi-user profile selector	Returned 429 error (Too Many Requests)	Indicates API rate limits
this file does not exist	Correctly indicated no info in context	Shows Gemini is not hallucinating
5. Testing Proof-of-Concept

Unique marker test: Insert a unique string in a file (TEST_MARKER_12345) and query → Gemini returns it correctly.

Validates FAISS index is used, not random generation.

6. Key Takeaways

Gemini successfully uses project context from FAISS index.

[GEMINI_MARKER] works as a prompt-level validation tool.

Query system is robust for multiple file types and languages (Markdown, Python, TypeScript).

System is ready for LLM chaining when Claude or other models return.

Rate-limiting and API errors must be handled gracefully in production.

7. Next Steps

Reinstate Claude → Gemini fallback logic once Claude API key is available.

Add logging of LLM used and response timestamps.

Experiment with chaining multiple LLMs:

Claude: deep reasoning, summarization

Gemini: project-specific context and code snippets

Copilot / local LLMs: code generation assistance

Add test suite for marker queries and context validation.

Consider generating daily summary.md automatically from FAISS index for rapid context retrieval.