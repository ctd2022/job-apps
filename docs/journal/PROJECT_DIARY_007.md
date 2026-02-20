# Project Diary - Entry 007: Claude Code Adoption - New Development Workflow

**Date**: 19 January 2026  
**LLM Used**: Claude Opus 4.5 (via claude.ai) → **Claude Code** (first use!)  
**Status**: ✅ DECISION MADE + TOOLING INSTALLED  
**Achievement**: Explored AGENTS.md, installed Claude Code, completed tutorial, switching development workflow

---

## What We Did Today

### 🤔 The Starting Question

> "I wonder if I should consider agentifying this project and build process. Just read about AGENTS.md and it sounds very interesting."

### 🎯 The Clarification

**Two different concepts were discussed:**

| Concept | What It Means | Decision |
|---------|---------------|----------|
| **Using Claude Code to BUILD faster** | CLI tool to accelerate development | ✅ YES - Starting now |
| **Making the APP agentic** | Job application tool runs autonomously | 🔮 Future (Track 4+) |

---

## Part 1: Research Phase

### What is AGENTS.md?

AGENTS.md is an open format for guiding coding agents - a "README for agents." Key points:

- **Purpose**: Provides context coding agents need (build steps, tests, conventions)
- **Hierarchical**: Root-level + package-level files, nearest takes precedence
- **Ecosystem**: Used by OpenAI Codex, Cursor, Google Jules, Factory, and more

### What is Claude Code?

Claude Code is Anthropic's CLI tool for agentic coding:

- **Global install**: Like `git` - install once, use in any project
- **Direct file access**: Reads/writes your codebase directly
- **Runs commands**: Executes pip, npm, tests, servers
- **Project memory**: CLAUDE.md persists context across sessions

### Claude Code vs Claude.ai (for coding projects)

| Factor | Claude.ai | Claude Code | Winner |
|--------|-----------|-------------|--------|
| Project context | Manual uploads | Sees entire codebase | 🏆 Claude Code |
| File editing | Copy/paste | Writes directly | 🏆 Claude Code |
| Running commands | Manual | Runs directly | 🏆 Claude Code |
| Continuity | Chat resets | CLAUDE.md persists | 🏆 Claude Code |
| Iteration speed | Slow | Fast | 🏆 Claude Code |
| Research/planning | Good | Overkill | Claude.ai |
| Web search | ✅ Yes | ❌ No | Claude.ai |

---

## Part 2: Action Phase

### Installed Claude Code

```powershell
npm install -g @anthropic-ai/claude-code
# added 2 packages in 2s
```

**Prerequisites confirmed:**
- ✅ Node.js installed
- ✅ npm 10.9.2 (sufficient)
- ✅ Claude Pro subscription (for authentication)

### Completed Tutorial

Watched introductory tutorial and practiced basic Claude Code workflow:
- Starting `claude` in a project directory
- Authentication with Claude Pro subscription
- Basic commands and interaction patterns
- Understanding permission modes

### Key Insight

> "Claude Code will see what's in my project so I don't need to remember to upload files or attach to a chat message."

This is the main advantage for our workflow - **automatic project context**.

---

## Part 3: The Decision

### Original Plan (from earlier in session)
- Finish Track 2 with claude.ai
- Learn Claude Code after
- Use Claude Code for Track 3

### Revised Plan (after trying tutorial)
- **Use Claude Code NOW for Track 2 Week 3**
- Create CLAUDE.md with project context
- Continue using claude.ai for research/planning/diary entries

### Why the Change?

1. **Tutorial was simple** - Lower learning curve than expected
2. **Immediate benefit** - No more manual file uploads
3. **Already installed** - Ready to use
4. **Track 2 Week 3 is ideal** - Polish work = lots of small file edits

---

## Understanding: Claude Code is a Global Tool

```
Global Tools (installed once, use everywhere)
├── git           → version control
├── node/npm      → JavaScript runtime
├── python        → Python runtime
└── claude        → AI coding assistant  ← NEW

Per-Project (created for each project)
├── venv/         → Python dependencies
├── node_modules/ → JS dependencies
├── .git/         → Git repo
└── CLAUDE.md     → Claude Code project context
```

**Key Understanding**: Claude Code is like Git - install globally, use in any project. The *project* still has its own venv for Python packages.

---

## Billing Model

**Claude Code uses your existing Claude Pro subscription** ($20/month):
- Same subscription as claude.ai
- No extra cost for Claude Code usage
- Usage limits apply (generous for personal use)

Alternative: API credits (pay-per-token) - not needed for our use case.

---

## When to Use Which Tool

| Task | Tool | Why |
|------|------|-----|
| Writing/editing code | **Claude Code** | Direct file access, runs tests |
| Track 2 Week 3 development | **Claude Code** | Many small file edits |
| Research & exploration | **Claude.ai** | Web search, discussion |
| Strategic planning | **Claude.ai** | Big picture thinking |
| Writing diary entries | **Claude.ai** | Documentation focus |
| Quick questions | **Either** | Depends on context |

---

## Future: AGENTS.md & Subagents

### Not Implementing Yet, But Noted for Future

**AGENTS.md** - Will create for project once comfortable with Claude Code basics

**Subagents** - Specialized agents for specific tasks (future consideration):
- cv-analyzer (read-only CV analysis)
- job-matcher (ATS scoring)
- cover-letter-writer
- docx-builder

**Skills** - Packaged expertise (future consideration):
- ATS Optimization skill
- DOCX Generation skill
- Multi-Backend LLM skill

**Timeline**: Learn basics first → Add CLAUDE.md → Consider subagents/skills later

---

## Files & Tools

### Installed Today
- ✅ Claude Code (`npm install -g @anthropic-ai/claude-code`)

### Documentation Updated
- ✅ PROJECT_DIARY_007.md (this file)

---

## Lessons Learned

### 1. Try Before Deciding
Initial analysis suggested waiting. After actually trying the tutorial, the learning curve was lower than expected.

### 2. Global Tools vs Project Dependencies
Claude Code = global tool (like git)
Project packages = per-project (venv, node_modules)

### 3. Right Tool for Right Task
- Claude Code: Building, coding, file editing
- Claude.ai: Research, planning, documentation, web search

### 4. One Step at a Time
Want to use agents/subagents eventually, but starting with basic Claude Code first.

---

## Summary

### What Happened Today
🔍 Researched AGENTS.md and Claude Code  
🔍 Clarified: BUILD tooling vs APP architecture (two different things)  
✅ Installed Claude Code globally  
✅ Completed introductory tutorial  
✅ Decided to use Claude Code for Track 2 Week 3  

### Key Decisions
| Decision | Answer |
|----------|--------|
| Use Claude Code for development? | ✅ YES - Starting tomorrow |
| Create CLAUDE.md? | ✅ YES - First task tomorrow |
| Implement subagents now? | ❌ NO - Learn basics first |
| Make the APP agentic? | 🔮 Future (Track 4+) |

---

## 🚀 NEXT STEPS: Tomorrow's Session

### Step 1: Navigate to Project
```powershell
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"
```

### Step 2: Activate Python Environment (for running project)
```powershell
.\venv\Scripts\Activate.ps1
```

### Step 3: Start Claude Code
```powershell
claude
```

### Step 4: First Instruction to Claude Code

Give Claude Code this orientation prompt:

```
Before we start coding, please read and understand our project documentation:

1. Read MASTER_VISION.md - This is our strategic direction
2. Read docs/journal/PROJECT_DIARY_006.md - Latest completed work (Track 2 Week 2)
3. Read docs/journal/PROJECT_DIARY_007.md - Today's decisions (Claude Code adoption)
4. Read QUICKSTART.md - How to run the project

After reading, summarize:
- What Track 2 Week 3 needs to accomplish
- Current project structure
- What's working vs what's pending

Then let's create a CLAUDE.md file that captures this context for future sessions.
```

### Step 5: Create CLAUDE.md

Work with Claude Code to create a `CLAUDE.md` file containing:
- Project overview
- Directory structure
- Key commands (run backend, run frontend, run tests)
- Current status (Track 2 Week 3)
- Coding conventions
- Important files to reference (MASTER_VISION.md, diary entries)

### Step 6: Begin Track 2 Week 3 Work

Focus areas:
- [ ] WebSocket integration for real-time progress
- [ ] File preview in browser
- [ ] Error boundaries and loading states
- [ ] Test with all three backends

---

## Quick Reference: Claude Code Commands

| Command | What It Does |
|---------|--------------|
| `claude` | Start Claude Code in current directory |
| `/clear` | Clear conversation (start fresh) |
| `/init` | Initialize CLAUDE.md for project |
| `Shift+Tab` | Toggle between modes (Default/Plan/Auto) |
| `Ctrl+C` | Cancel current operation |
| Up Arrow | Navigate through past commands |

---

**Status**: 🟢 **READY TO START WITH CLAUDE CODE TOMORROW**

**Next Session**: Track 2 Week 3 via Claude Code

---

**End of Entry 007**