# Project Diary 018 - Establishing the Multi-Agent Workflow

**Date**: 30 January 2026
**Focus**: Development Workflow & Tooling
**Status**: COMPLETE

---

## Summary

This session established a new multi-agent development workflow to address the scaling challenges of the project. After experimenting with and abandoning other solutions like Cline and a custom RAG pipeline, a "buddy system" was implemented using Claude Code as the Lead Architect and Gemini CLI as a Secondary Agent for specific tasks. The handover protocol was defined and validated with a test task.

---

## The Problem: AI-Assisted Development at Scale

As the project has grown (now with 17 diary entries and a backlog of over 50 ideas), the limitations of a single AI development tool became apparent. While Claude Code (Opus 4.5) has been effective as the primary tool, its context window has limits. Certain development tasks, such as repository-wide refactoring, boilerplate generation, and large-context analysis, could be handled more efficiently by a tool with a larger context capacity.

## Cline Experiment (Failed)

An initial experiment was conducted with Cline, a VS Code extension for AI-powered coding. However, it proved unsuitable for our local-first development goal. The locally available LLMs (including Llama 3.1 8B and Mistral Small) were not powerful enough to support Cline's agentic workflow, which requires a Claude or GPT-4 class model, thus defeating the purpose of using local tools.

## Local RAG Pipeline (Built then Archived)

A custom Retrieval-Augmented Generation (RAG) pipeline was developed to provide codebase-aware context to an LLM. This involved:
- `index_project.py`: To chunk and embed the entire codebase into a FAISS vector index.
- `query_index.py`: To perform local semantic search on the index.
- `query_master.py`: A full RAG loop to query the index and send the context to the Gemini API.

While functional, this pipeline was ultimately made redundant by the native capabilities of more integrated tools like Claude Code (with direct file access), the Gemini CLI (with its 1M token context window), and GitHub Copilot. The RAG pipeline scripts were archived with a README explaining their purpose.

## The Solution: Claude + Gemini Buddy System

The final solution was to implement a multi-agent "buddy system" by integrating the Gemini CLI into the development environment. A clear delegation protocol was established:
- **Claude (Lead Architect)**: Responsible for architectural decisions, core logic design, and complex bug diagnosis.
- **Gemini (Secondary Agent)**: Handles tasks like bulk file changes, boilerplate code, repo-wide refactors, and documentation.

To facilitate this, `GEMINI.md` was created as a comprehensive context file for the Gemini agent, and `CLAUDE.md` was updated. The handover process is managed via a `TODO.md` file, where Claude assigns tasks and Gemini reports on their completion.

## Validation: First Handover Test

The new workflow was validated with an end-to-end test.
1.  Claude created a `TODO.md` file with instructions to improve the comments in the `.gitignore` file.
2.  The user switched to the Gemini CLI.
3.  Gemini read its context from `GEMINI.md`, understood the task from `TODO.md`, and successfully updated `.gitignore`.
4.  Gemini then updated `TODO.md` to mark the task as complete.
5.  Claude reviewed the changes, confirming the protocol was followed correctly.

## Meta: This Diary Entry

This diary entry itself serves as the second successful handover task. The content was specified by Claude in `TODO.md` and the entry was written by Gemini, further validating the effectiveness of the multi-agent workflow for real-world development tasks like documentation.

---

## Files Changed

| File | Changes |
|------|---------|
| `GEMINI.md` | NEW - Full project context for Gemini CLI as secondary agent |
| `CLAUDE.md` | Expanded Agent Delegation section with handover protocol |
| `TODO.md` | NEW - Handover artifact for Claude/Gemini task delegation |
| `.gitignore` | Added *.faiss, *.pkl; improved section comments (Gemini's first task) |
| `archived_code/README.md` | NEW - Documents the archived RAG pipeline |
| `archived_code/index_project.py` | MOVED from project root |
| `archived_code/query_index.py` | MOVED from project root |
| `archived_code/query_master.py` | MOVED from project root |

---

## What's Next

With the multi-agent workflow validated, development will proceed on Track 2.9.2 (Core UX), focusing on Match Explanation Cards and other UI improvements. This new workflow will be utilized for appropriate tasks to accelerate development.

---

## Commits

```
8b7ac19 Add multi-agent delegation protocol and archive RAG pipeline
f326d7e Validate agent handover protocol (Gemini test task)
```

---

**End of Diary Entry 018**
