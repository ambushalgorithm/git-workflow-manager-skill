# Git Workflow Manager - Testing Requirements

> Testing requirements. See [REQUIREMENTS.md](REQUIREMENTS.md) for overview.

---

## 1. Unit Tests

| Test | Description |
|------|-------------|
| REPO-DETECT | Test fork vs internal detection |
| BRANCH-CREATE | Test branch creation logic |
| COMMIT-PARSE | Test commit metadata parsing |
| SYNC-LOGIC | Test rebase/merge strategy selection |
| CONFIG | Test config load/save |

---

## 2. E2E Tests

### 2.1 Fork Workflow

1. Create test fork repo with upstream remote
2. Initialize workflow (`git-workflow init`)
3. Create feature branch
4. Make commits
5. Sync branches
6. Prepare PR
7. Verify branch state

### 2.2 Internal Workflow

1. Create test internal repo
2. Initialize workflow (`git-workflow init --type internal`)
3. Create feature branch
4. Make commits
5. Sync branches
6. Prepare PR
7. Verify branch state

### 2.3 Conflict Resolution

1. Create branch with conflicting changes
2. Attempt sync
3. Verify conflict detection
4. Verify abort works

### 2.4 Daily Report

1. Setup repo with various branch states
2. Run daily check
3. Verify report output format

---

## 3. E2E Setup

| Repo Type | Container | Setup |
|-----------|-----------|-------|
| OpenClaw | Use `openclaw-e2e-skill` | Spin up OpenClaw container |
| Other | Plain Docker | `ubuntu:22.04` with git installed |

---

## 4. Test Data

Each E2E test should create:
- Remote mock (local git server or file:// URLs)
- Initial commits
- Branch state to test against

---

*See [REQUIREMENTS-FEATURES.md](REQUIREMENTS-FEATURES.md) for feature requirements.*
