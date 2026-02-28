# Git Workflow Manager - New Workflow Implementation

**Branch:** `feat/new-workflow`

**Goal:** Update the branch hierarchy and sync commands for a cleaner workflow.

---

## New Branch Hierarchy

```
upstream/master (original repo)
        ↑ (PRs merged here)
origin/master            ← synced with upstream
        ↑
origin/staging           ← ALL changes (PR'd + internal), created from master
        ↑
origin/develop           ← rebased from staging
        ↑
origin/feat/*
```

---

## New CLI Commands

```bash
# Initialize workflow on a repo
git-workflow init

# Create a feature branch
git-workflow create feat my-new-feature

# Sync branches
git-workflow sync master           # NEW: Sync local master from upstream
git-workflow sync staging          # Rebase staging onto master
git-workflow sync develop          # Rebase develop onto staging

# Rebase (new syntax)
git-workflow rebase develop master     # Rebase develop onto master (upstream changes)
git-workflow rebase develop staging    # Rebase develop onto staging (all changes)

# PR management
git-workflow pr-branch create <name>
git-workflow pr-branch update <name>
git-workflow pr-branch list
git-workflow pr create <branch>

# Daily/automation
git-workflow daily
git-workflow status
```

---

## Implementation Tasks

### Phase 1: New sync master Command

- [ ] Create `git-workflow sync master` command
- [ ] Implementation: `git fetch upstream && git pull upstream/master`
- [ ] For forks only (error if no upstream remote)
- [ ] Update docs

### Phase 2: Update rebase Command

- [ ] Allow specifying any target branch: `git-workflow rebase develop master`
- [ ] Current: rebase onto develop by default
- [ ] New: rebase onto any specified branch
- [ ] Update CLI to accept parent branch argument

### Phase 3: Update init Command

- [ ] `git-workflow init` creates: `master`, `staging`, `develop` (no integration)
- [ ] For forks: setup upstream remote
- [ ] For internal: just local branches

### Phase 3: Remove integration

- [ ] Remove `integration` from branch hierarchy config
- [ ] Remove `integration` from types.ts
- [ ] Update docs to remove integration references

### Phase 4: Update Documentation

- [ ] Update README.md with new hierarchy
- [ ] Update Complete-PR-Workflow.md
- [ ] Update any other docs

---

## Testing

- [ ] Run unit tests (in Docker on QA1)
- [ ] Run E2E tests (in Docker on QA1)
- [ ] Target: ≥95% code coverage

---

## Testing

### Running Tests on QA1

**⚠️ NEVER run tests locally - always run in Docker on QA1**

All tests run in Docker for isolation and consistency.

**Full workflow:**

1. **Check if repo exists on QA1:**
   ```bash
   ssh deploy@100.75.20.121 "ls ~/Projects/openclaw-skills-development/git-workflow-manager"
   ```
   - If missing: clone from `git@github.com-ambushalgorithm:ambushalgorithm/git-workflow-manager-skill.git`

2. **Commit & push local changes** (from this machine)

3. **On QA1 - Build & Run:**
   ```bash
   cd ~/Projects/openclaw-skills-development/git-workflow-manager
   git pull
   
   # Build Docker image
   docker build -t git-workflow-test .
   
   # Run unit tests with coverage
   docker run --rm git-workflow-test
   
   # Or run specific test file
   docker run --rm git-workflow-test npm test -- --testPathPattern="repo.test.ts"
   ```

4. **Review coverage** - Must hit >= 95%

### E2E Testing

E2E tests also run in Docker containers:

1. **Fork test repo** (for fork workflow):
   ```bash
   gh repo fork ambushalgorithm/Git-Workflow-Manager-Test-Repo
   ```

2. **Internal test repo** (for internal workflow):
   ```bash
   gh repo clone ambushalgorithm/Git-Workflow-Manager-Test-Repo internal-test
   ```

3. **Run E2E in Docker:**
   ```bash
   # From project root
   docker run -v $(pwd):/app -w /app node:20-alpine sh -c "\
     apk add git && \
     npm install && \
     npm run build && \
     npm test -- --testPathPattern='e2e'"
   ```

### Test Commands Summary

```bash
# Run all tests (excluding daily)
docker run --rm git-workflow-test npm test -- --testPathIgnorePatterns="daily"

# Run specific test file
docker run --rm git-workflow-test npm test -- --testPathPattern="sync.test.ts"

# Run with coverage
docker run --rm git-workflow-test npm test -- --coverage
```

---

## PR Workflow

### Branch Hierarchy
```
master (production)
  ↑
staging (main working branch - ALL changes go here)
  ↑
develop (rebased working base)
  ↑
feat/*
```

### PR Flow
All PRs target `staging`. Master is updated via PRs from staging or release branches.

```
feat/* → PR → staging → PR → master
                ↑
          release/* → PR → master
```

### Commands
```bash
# Work on feature
git-workflow create feat my-feature
git-workflow pr-branch create my-feature
git-workflow pr create my-feature
# Auto-targets staging

# After PR merges, update develop
git-workflow rebase develop staging

# To update master (from staging)
gh pr create --base master --head staging

# Or from release branch
gh pr create --base master --head release/1.0.0
```

### Fork vs Internal
The only difference is the sync step:

- **Fork:** `git-workflow sync master` (sync from upstream) → `git-workflow rebase develop master`
- **Internal:** Just `git-workflow rebase develop master` (no upstream)

---

*Created: 2026-02-27*
