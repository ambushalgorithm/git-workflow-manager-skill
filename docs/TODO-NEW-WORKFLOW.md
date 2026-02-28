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

*Created: 2026-02-27*
