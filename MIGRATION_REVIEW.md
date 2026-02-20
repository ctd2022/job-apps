# Project Migration Review

You are reviewing this project to prepare it for migration to a new location within a programme hierarchy. Conduct a thorough stocktake and produce a migration readiness report.

## Your Task

Analyse this project for anything that would break or need updating when the project is moved to a new directory path. Be thorough—missed dependencies cause silent failures.

---

## 1. Path Analysis

### Hardcoded Absolute Paths

Search for absolute paths in all files:

```bash
# Find potential absolute paths (adjust patterns for your OS)
grep -rn --include="*.py" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.toml" --include="*.md" --include="*.sh" --include="*.env*" -E "(/home/|/Users/|C:\\\\|~\/)" .
```

Report each instance with:
- File and line number
- Current value
- Whether it can be made relative or environment-variable-based

### Relative Path Dependencies

Identify any imports or references that reach outside the project folder:

```bash
# Find parent directory references
grep -rn "\.\.\/" . --include="*.py" --include="*.ts" --include="*.js" --include="*.json"
```

Report:
- What external resources are being referenced
- Whether these are sibling projects, shared libraries, or parent config

---

## 2. Configuration Audit

### Environment Files

List all environment and config files:

```bash
find . -name ".env*" -o -name "*.env" -o -name "config*.json" -o -name "config*.yaml" -o -name "config*.toml" -o -name "settings*.py" 2>/dev/null
```

For each file, check for:
- [ ] Hardcoded paths
- [ ] References to other projects
- [ ] Machine-specific values
- [ ] Secrets that reference file paths (e.g., key file locations)

### Package Configuration

Review these files if present:
- `pyproject.toml` / `setup.py` / `setup.cfg`
- `package.json`
- `Cargo.toml`
- `go.mod`

Check for:
- [ ] Local path dependencies (e.g., `path = "../shared-lib"`)
- [ ] Workspace references
- [ ] Build scripts with hardcoded paths

---

## 3. External Integrations

### Database Connections

Search for database paths (especially SQLite):

```bash
grep -rn --include="*.py" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" -E "(\.db|\.sqlite|sqlite:///|DATABASE_URL)" .
```

Report:
- Database type and connection method
- Whether path is relative, absolute, or environment-driven
- Location of any local database files

### API and Service References

Check for:
- [ ] Webhook URLs that include environment-specific paths
- [ ] OAuth callback URLs
- [ ] Service discovery configs
- [ ] Inter-service communication endpoints

### File Storage

Identify where the project reads/writes files:

```bash
# Python
grep -rn "open(" --include="*.py" .
grep -rn "Path(" --include="*.py" .

# Node
grep -rn "readFile\|writeFile\|createReadStream" --include="*.js" --include="*.ts" .
```

Report:
- Input file locations
- Output/generated file locations
- Log file paths
- Cache directories

---

## 4. CI/CD and Tooling

### CI Configuration

Review if present:
- `.github/workflows/*.yml`
- `.gitlab-ci.yml`
- `Jenkinsfile`
- `.circleci/config.yml`

Check for:
- [ ] Hardcoded paths in build steps
- [ ] Artifact paths
- [ ] Cache paths
- [ ] Deployment paths

### IDE and Editor Config

Review if present:
- `.vscode/settings.json`
- `.vscode/launch.json`
- `.idea/` files
- `pyrightconfig.json` / `tsconfig.json`

Check for:
- [ ] Workspace-relative paths that assume current location
- [ ] Debug configurations with absolute paths
- [ ] Include/exclude paths

### Git Configuration

Check:
- `.gitmodules` (submodule paths)
- `.git/config` (worktree paths, if applicable)

---

## 5. Documentation References

### README and Docs

Search documentation for path references:

```bash
grep -rn --include="*.md" --include="*.rst" --include="*.txt" -E "(/home/|/Users/|~\/|\.\.\/)" .
```

Check for:
- [ ] Installation instructions with absolute paths
- [ ] Example commands assuming specific locations
- [ ] Architecture diagrams referencing file structure

### CLAUDE.md / Agent Context

If present, review for:
- [ ] Inheritance paths that will need updating
- [ ] References to sibling projects
- [ ] Setup instructions with paths

---

## 6. Dependencies Inventory

### External Dependencies

List all external packages (no action needed, just inventory):

```bash
# Python
cat requirements*.txt pyproject.toml 2>/dev/null | grep -E "^[a-zA-Z]"

# Node
cat package.json | jq '.dependencies, .devDependencies'
```

### Local/Path Dependencies

**These require migration attention:**

```bash
# Python - find local path dependencies
grep -E "path\s*=" pyproject.toml setup.cfg 2>/dev/null
grep -E "^-e\s+\.\." requirements*.txt 2>/dev/null
grep -E "file://" requirements*.txt 2>/dev/null

# Node - find local path dependencies  
cat package.json | jq -r '.dependencies, .devDependencies | to_entries[] | select(.value | startswith("file:") or startswith("link:") or startswith("../")) | "\(.key): \(.value)"'
```

Report each with:
- Package name
- Current path
- What it provides
- Recommendation (migrate together, extract to shared, or convert to published package)

---

## 7. Runtime Assumptions

### Working Directory Assumptions

Search for code that assumes specific working directory:

```bash
grep -rn "os.getcwd\|os.chdir\|process.cwd\|__file__" --include="*.py" --include="*.js" --include="*.ts" .
```

Flag any that construct paths assuming the project is in a specific location.

### Symlinks

```bash
find . -type l -ls
```

Report any symlinks and what they point to.

### Mounted Volumes / External Paths

If this runs in containers, check:
- `docker-compose.yml`
- `Dockerfile`
- Kubernetes manifests

For volume mounts referencing host paths.

---

## 8. Report Template

After completing your analysis, produce a report in this format:

```markdown
# Migration Readiness Report: [Project Name]

**Current Location**: [path]
**Target Location**: [path, if known]
**Review Date**: [date]

## Summary

- **Migration Complexity**: [Low / Medium / High]
- **Blocking Issues**: [count]
- **Items Requiring Updates**: [count]

## Blocking Issues

[Issues that must be resolved before migration]

1. [Issue description]
   - File: [path]
   - Current value: [value]
   - Required action: [action]

## Required Updates

[Items that need changing but won't block migration]

### Hardcoded Paths
| File | Line | Current Value | Recommended Change |
|------|------|---------------|-------------------|
| | | | |

### Configuration Files
| File | Setting | Current Value | Recommended Change |
|------|---------|---------------|-------------------|
| | | | |

### Local Dependencies
| Dependency | Current Path | Recommendation |
|------------|--------------|----------------|
| | | |

### Documentation
| File | Issue | Required Update |
|------|-------|-----------------|
| | | |

## No Changes Required

[Items reviewed and confirmed safe]

- [ ] External package dependencies (all from registries)
- [ ] Relative imports within project
- [ ] [other items]

## Post-Migration Checklist

After moving the project:

- [ ] Update CLAUDE.md inheritance path
- [ ] Update [specific config file]
- [ ] Run tests to verify
- [ ] Update any CI/CD pipeline references
- [ ] Notify dependent projects (if any): [list]

## Recommendations

[Any architectural suggestions to make future migrations easier]

1. [Recommendation]
```

---

## 9. Quick Commands Reference

Run these from the project root for a fast initial scan:

```bash
# All-in-one initial scan
echo "=== Absolute Paths ===" && \
grep -rn --include="*.py" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.toml" --include="*.sh" -E "(/home/|/Users/|C:\\\\)" . 2>/dev/null | head -20

echo -e "\n=== Parent Directory References ===" && \
grep -rn "\.\.\/" . --include="*.py" --include="*.ts" --include="*.js" --include="*.json" 2>/dev/null | head -20

echo -e "\n=== Database Files ===" && \
find . -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" 2>/dev/null

echo -e "\n=== Environment Files ===" && \
find . -name ".env*" -o -name "*.env" 2>/dev/null

echo -e "\n=== Symlinks ===" && \
find . -type l 2>/dev/null

echo -e "\n=== Local Path Dependencies ===" && \
grep -E "(path\s*=|file:|link:|\"\.\./)" pyproject.toml package.json 2>/dev/null
```

---

## 10. Notes for Agent

- Be thorough but practical—flag real issues, not theoretical ones
- If you can't run commands (e.g., no shell access), analyse files directly
- When uncertain, flag for human review rather than assuming safe
- Consider both development and production environments
- Remember: a missed dependency fails silently; over-flagging just needs human triage
