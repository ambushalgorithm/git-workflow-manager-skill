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

## New Sync Commands

```bash
# 1. Sync local master from upstream (NEW)
git-workflow sync master

# 2. Rebase develop onto master (get upstream changes)
git-workflow rebase develop master

# 3. Rebase develop onto staging (get ALL changes)
git-workflow rebase develop staging
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

*Created: 2026-02-27*
