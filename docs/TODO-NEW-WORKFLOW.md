# Git Workflow Manager - New Workflow Implementation

**Branch:** `feat/new-workflow`

**Goal:** Update the branch hierarchy and sync commands for a cleaner workflow.

---

## New Branch Hierarchy

```
master (production)
  ↑
staging (main working branch - ALL changes)
  ↑
develop (rebased working base)
  ↑
feat/*
```

---

## New CLI Commands

```bash
# Initialize workflow on a repo
git-workflow init

# Create a feature branch (from develop)
git-workflow create feat my-new-feature

# Sync local master from upstream (fork only)
git-workflow sync master

# Rebase (new syntax: git-workflow rebase <branch> <target>)
git-workflow rebase develop staging    # Get ALL changes in develop
git-workflow rebase develop master     # Get upstream changes in develop (fork only)

# PR management
git-workflow pr-branch create <name>  # Create PR branch from pr-ready commits
git-workflow pr-branch update <name>  # Update PR branch with new pr-ready commits
git-workflow pr-branch list           # List active PR branches
git-workflow pr create <name>         # Create PR (auto-targets staging)

# Tagging
git-workflow tag <commit> pr-ready    # Mark commit for PR
git-workflow tag <commit> internal-only # Mark commit as internal

# View commits
git-workflow pr-ready                 # List pr-ready commits
git-workflow internal                 # List internal-only commits
git-workflow commits                  # List all tracked commits

# Daily/automation
git-workflow daily                   # Run daily check + report
git-workflow status                  # Show current status
```

---

## Implementation Phases

### Phase 1: Update sync command

**Add `sync master` and remove old sync commands**

- [ ] Add `git-workflow sync master` - fetches from upstream, pulls to local master
  - Implementation: `git fetch upstream && git pull upstream/master`
  - For forks only (error if no upstream remote)
- [ ] Remove `sync staging` (deprecated - use rebase instead)
- [ ] Remove `sync develop` (deprecated - use rebase instead)
- [ ] Update CLI to remove old sync commands
- [ ] Update docs

**Files to modify:**
- `src/commands/sync.ts` - Add sync master, remove old sync commands
- `src/index.ts` - Update CLI

### Phase 2: Update rebase command

**Change syntax from `git-workflow rebase [parent]` to `git-workflow rebase <branch> <target>`**

- [ ] Update rebase to accept two arguments: branch and target
- [ ] Example: `git-workflow rebase develop staging` rebases develop onto staging
- [ ] Default behavior: if only one arg, assume it's target and use current branch
- [ ] Update CLI help text

**Files to modify:**
- `src/commands/rebase.ts` - Update argument parsing
- `src/index.ts` - Update CLI

### Phase 3: Update init command

**Create simplified branch hierarchy: master, staging, develop**

- [ ] `git-workflow init` creates: `master`, `staging`, `develop` (no integration)
- [ ] For forks: setup upstream remote, create branches from master
- [ ] For internal: just local branches from master
- [ ] Update docs with setup instructions

**Files to modify:**
- `src/commands/init.ts` - Simplify branch creation
- `src/index.ts` - Update CLI

### Phase 4: Update PR target

**All PRs target staging**

- [ ] Update `getPRTarget()` in pr-branch.ts to always target `staging`
- [ ] Remove integration references
- [ ] Update PR creation to use staging as default

**Files to modify:**
- `src/lib/pr-branch.ts` - Update getPRTarget()

### Phase 5: Remove integration

**Remove integration from code and config**

- [ ] Remove `integration` from types.ts
- [ ] Remove `integration` from config/hierarchy
- [ ] Remove from all related code

**Files to modify:**
- `src/types.ts` - Remove integration
- `src/lib/*.ts` - Remove integration references

### Phase 6: Update Documentation

**Update all docs with new workflow**

- [ ] Update README.md with new hierarchy
- [ ] Update Complete-PR-Workflow.md
- [ ] Update SKILL.md if needed

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

### Test Checklist

- [ ] Run unit tests (must pass ≥95% coverage)
- [ ] Run E2E tests
- [ ] Test sync master command
- [ ] Test rebase with new syntax
- [ ] Test PR creation targets staging

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
*Last Updated: 2026-02-27*
