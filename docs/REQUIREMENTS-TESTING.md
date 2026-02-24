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

### 2.5 Rebase Scenarios

#### 2.5.1 Rebase Feature onto Master
1. Create feature branch from master
2. Add commits to master
3. Rebase feature onto master
4. Verify feature has new commits from master

#### 2.5.2 Rebase Develop onto Staging
1. Create commits on develop
2. Rebase develop onto staging
3. Verify develop is clean on staging

#### 2.5.3 Rebase with Conflicts
1. Create feature branch
2. Modify same file on both master and feature
3. Attempt rebase
4. Verify conflict detected
5. Resolve conflict and complete rebase

#### 2.5.4 Force Push After Rebase
1. Rebase feature branch
2. Force push with lease
3. Verify remote updated safely

### 2.6 Cherry-Pick Scenarios

#### 2.6.1 Cherry-Pick Single Commit
1. Create commits on feature branch
2. Cherry-pick specific commit to integration
3. Verify commit applied correctly

#### 2.6.2 Cherry-Pick Multiple Commits
1. Create multiple commits on feature branch
2. Cherry-pick range to integration
3. Verify all commits applied in order

#### 2.6.3 Cherry-Pick with Conflicts
1. Create commits with conflicting changes
2. Attempt cherry-pick to integration
3. Verify conflict detection
4. Resolve and complete cherry-pick

### 2.7 Branch Management Scenarios

#### 2.7.1 Create Feature Branch
1. Create new feature branch from develop
2. Verify branch created from correct parent

#### 2.7.2 Create Hotfix Branch
1. Create hotfix branch from master
2. Make hotfix commits
3. Merge to master and develop

#### 2.7.3 Create Release Branch
1. Create release branch from develop
2. Make release commits
3. Merge to master and develop

#### 2.7.4 Delete Branch
1. Delete merged feature branch
2. Verify branch removed locally and remotely

### 2.8 Upstream Sync Scenarios (Fork Only)

#### 2.8.1 Sync Fork from Upstream
1. Add upstream remote commits
2. Sync fork's master from upstream
3. Verify fork master matches upstream

#### 2.8.2 Sync All Branches
1. Run `sync all` command
2. Verify all hierarchy branches synced

### 2.9 Integration Branch Scenarios

#### 2.9.1 Prepare PR to Upstream
1. Cherry-pick commits to integration branch
2. Push integration branch
3. Verify ready for upstream PR

#### 2.9.2 Sync Integration with Master
1. Rebase integration onto master
2. Verify no conflicts

### 2.10 Multi-Branch Scenarios

#### 2.10.1 Multiple Feature Branches
1. Create multiple feature branches
2. Sync each to develop
3. Verify no interference between branches

#### 2.10.2 Stale Branch Detection
1. Create old feature branch
2. Run daily check
3. Verify stale branch detected

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
