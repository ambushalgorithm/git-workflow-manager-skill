# Git Workflow Manager - Implementation Plan

**Language:** TypeScript/Node.js  
**Port TODO:** Python  
**Requirements Source:** [REQUIREMENTS.md](REQUIREMENTS.md)

> ⚠️ This TODO is derived from REQUIREMENTS.md. All features should match the requirements document.

---

## Architecture

### Repo Types Supported

| Type | Structure |
|------|-----------|
| **Open Source (Fork)** | `upstream/master` → `origin/master` → `origin/staging` → `origin/integration` → `origin/develop` |
| **Closed Source** | `master` → `staging` → `integration` → `develop` |

### Branch Hierarchy

```
[upstream/master] (read-only, for forks)
        ↑
[origin/master]   ← synced with upstream (fork) or production (closed)
        ↑
[origin/staging] ← ALL changes (PR'd + non-PR'd), running in prod
        ↑
[origin/integration] ← PR-ready subset only
        ↑
[origin/develop] ← rebased working base
        ↑
[origin/release/x.x.x]  ← version snapshots
[origin/hotfix/*]       ← emergency fixes
[origin/feat/*]         ← feature work
```

---

## Features & Implementation Phases

### Phase 1: Repo Detection & Branch Setup

#### 1.1 Detect Repo Type
- Check for `upstream` remote → Open Source (Fork)
- No `upstream` → Closed Source (Internal)
- Prompt user to confirm or override

#### 1.2 Create Branch Hierarchy
- **Open Source:** `master` → `staging` → `develop` → `integration`
- **Closed Source:** `staging` → `integration` → `develop`
- Push all branches to origin
- Set default branch (usually `develop`)

#### 1.3 Store Config
- Save repo type in `.git/workflow-config.json`
- Track upstream remote URL for open source

**Reference:** Use `git remote -v` to detect, `git branch -a` for existing branches

---

### Phase 2: Rebase & Cherry-Pick Flows

#### 2.1 Sync Staging
```
git fetch --all
git checkout staging
git rebase master  # or origin/master for forks
git push --force-with-lease origin staging
```

#### 2.2 Sync Develop
```
git checkout develop
git rebase staging
git push --force-with-lease origin develop
```

#### 2.3 Cherry-Pick to Integration
- List commits on feature branch not in staging
- Allow user to select which commits to cherry-pick
- Create integration branch with selected commits
- Open PR or prepare for PR

#### 2.4 Feature Branch Workflow
- Create feature branch off `develop`: `git checkout -b feat/xxx develop`
- Rebase onto `develop`: `git rebase develop`
- Merge to `staging`: `git checkout staging && git merge feat/xxx`

**Reference:** Use `git log --oneline develop..HEAD` to find commits not in develop

---

### Phase 3: Commit Tracking (PR-able vs Internal)

#### 3.1 Tag Commits
- Add metadata to commits indicating:
  - `pr-ready` - intended for upstream PR
  - `internal-only` - never going upstream
  - `pending` - undecided

#### 3.2 Track in Config
```json
{
  "commits": {
    "abc123": {
      "status": "pr-ready",
      "message": "feat: add hook system",
      "upstream_pr": null,
      "tags": ["v1.2.0-internal"]
    }
  }
}
```

#### 3.3 Query Interface
- List all `pr-ready` commits not yet in upstream
- List all `internal-only` changes on staging
- Show diff between staging and integration

**Reference:** Use `git log --format="%H %s"` and parse for metadata

---

### Phase 4: Daily PR Status Check

#### 4.1 GitHub CLI Integration
- Use `gh pr list` for authenticated repo
- Parse PR state: `open`, `merged`, `closed`
- Track: `headBranch`, `baseBranch`, `status`, `url`

#### 4.2 Upstream PR Monitor
- For forks: Check `upstream` remote's default branch PRs
- Use GitHub API via `gh` or direct API call
- Store last-known state to detect changes

#### 4.3 Status Report
- Daily report showing:
  - Open PRs and their status
  - Blockers (conflicts, failing tests, stale)
  - Branches needing attention
  - Upstream changes to rebase onto

**Reference:** Use `gh pr view <pr-number> --json state,mergeable,checks` for detailed status

---

### Phase 5: Branch Updates (Merge/Rebase Logic)

#### 5.1 Detect Update Type
- If PR is `open` and target branch changed → rebase or merge
- If PR is `merged` → fast-forward or rebase child branches
- If PR is `closed` → mark as not merging

#### 5.2 Auto-Merge Strategy
- **Option A (Rebase):** `git rebase master` on feature → keeps history linear
- **Option B (Merge):** `git merge master` → creates merge commit
- User configurable per-repo

#### 5.3 Handle Conflicts
- Detect conflicts: `git merge --abort` check exit code
- Report conflicts to user
- Offer: resolve manually, skip, or create conflict branch

**Reference:** Use `git status --porcelain` to detect conflicts

---

### Phase 6: Testing & Reporting

#### 6.1 Unit Tests
- Test repo type detection
- Test branch creation logic
- Test commit parsing/metadata
- Mock git commands where possible

#### 6.2 E2E Tests
- **OpenClaw repos:** Use `openclaw-e2e-skill` (spin up OpenClaw Docker container)
- **Other repos:** Use plain Docker container with git installed (e.g., `ubuntu:22.04`)

#### 6.3 Daily Report Format
```
=== Git Workflow Daily ===
Repo: openclaw-fork (Open Source)
Date: 2026-02-19

BRANCH STATUS:
✓ master - synced with upstream
✓ staging - 3 commits ahead
✓ integration - 2 commits ahead (1 PR open)
✓ develop - synced with staging

PR STATUS:
#126 feat/hook-system - OPEN (checks passing)
#127 feat/new-feature - DRAFT (needs tests)

NEEDS ATTENTION:
- staging has 1 conflict with upstream (run: sync staging)
- develop is 5 commits behind staging (run: sync develop)

BLOCKERS:
- None
```

---

## CLI Commands (Proposed)

```bash
# Init workflow on new repo
git-workflow init                    # Auto-detect and setup
git-workflow init --type fork       # Force fork mode
git-workflow init --type internal   # Force internal mode

# Sync branches
git-workflow sync staging           # Rebase staging onto master
git-workflow sync develop           # Rebase develop onto staging
git-workflow sync all               # Sync entire hierarchy

# Feature branches
git-workflow create feat/new-ui     # Create off develop
git-workflow create hotfix/bug-fix  # Create off staging
git-workflow rebase                 # Rebase current onto parent

# PR management
git-workflow prepare-pr              # Cherry-pick to integration
git-workflow list-pr                # List PR-able commits
git-workflow status                 # Full status report

# Daily/automated
git-workflow daily                  # Run daily check + report
git-workflow check-upstream         # Check upstream PRs
```

---

## Dependencies

### Existing Skills to Leverage
- **openclaw-e2e-skill** - For E2E testing in Docker
- **github-skill** - For GitHub API/PR operations (if needed)
- **git-commit-skill** - For conventional commit handling

### External Tools
- `git` - Core functionality
- `gh` (GitHub CLI) - PR operations
- `jq` - JSON processing

---

## File Structure

```
git-workflow-manager/
├── SKILL.md                    # Main skill definition
├── docs/
│   ├── TODO.md                 # This file
│   └── DESIGN.md               # Architecture decisions
├── src/
│   ├── index.ts                # Entry point, CLI parser
│   ├── commands/
│   │   ├── init.ts             # Repo init + branch setup
│   │   ├── sync.ts             # Branch syncing logic
│   │   ├── create.ts           # Feature/hotfix creation
│   │   ├── rebase.ts           # Rebase operations
│   │   ├── pr.ts               # PR preparation & tracking
│   │   ├── status.ts           # Status reporting
│   │   └── daily.ts            # Daily check automation
│   ├── lib/
│   │   ├── git.ts              # Git operations wrapper
│   │   ├── repo.ts             # Repo detection & config
│   │   ├── commits.ts          # Commit tracking
│   │   ├── github.ts           # GitHub API integration
│   │   └── report.ts           # Report generation
│   └── types.ts                # TypeScript interfaces
├── tests/
│   ├── unit/
│   │   ├── repo.test.ts        # Repo detection tests
│   │   ├── commits.test.ts     # Commit tracking tests
│   │   └── sync.test.ts        # Sync logic tests
│   └── e2e/
│       ├── fork.test.ts        # Fork scenario E2E
│       └── internal.test.ts    # Internal repo E2E
├── assets/
│   ├── workflow-config.schema.json
│   └── test-repo-setup.sh      # Script to create test repos
└── package.json
```

---

## Python Port TODO

> ⚠️ After completing TypeScript implementation, port to Python using REQUIREMENTS.md as source of truth.

When porting to Python:
- [ ] Create `pyproject.toml` with dependencies
- [ ] Implement all CLI commands in Python
- [ ] Use `GitPython` for Git operations
- [ ] Create Python-specific unit tests
- [ ] Create Python E2E test setup
- [ ] Document in README with pip install instructions

---

## Implementation Order

1. **Phase 1** - Repo detection + branch setup (core)
2. **Phase 2** - Sync/rebase flows (essential)
3. **Phase 3** - Commit tracking (important)
4. **Phase 4** - PR status check (daily automation)
5. **Phase 5** - Branch update logic (automation)
6. **Phase 6** - Tests + reporting

---

## Configuration Schema

```json
{
  "version": "1.0",
  "type": "fork" | "internal",
  "upstream": {
    "remote": "upstream",
    "url": "https://github.com/openclaw/openclaw.git",
    "defaultBranch": "master"
  },
  "origin": {
    "remote": "origin",
    "defaultBranch": "develop"
  },
  "branches": {
    "master": "master",
    "staging": "staging",
    "integration": "integration",
    "develop": "develop",
    "releasePrefix": "release/",
    "hotfixPrefix": "hotfix/",
    "featurePrefix": "feat/"
  },
  "tracking": {
    "commits": {},
    "prs": {}
  },
  "settings": {
    "syncStrategy": "rebase" | "merge",
    "autoSync": false,
    "dailyReport": true
  }
}
```

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

---

## Open Questions / Blockers

1. [ ] How to handle multiple upstreams? (rare but possible)
2. [ ] Authentication for GitHub API - use `gh` auth or personal access token?
3. [ ] Store config in repo (`.git/workflow.json`) or separate location?
4. [ ] How to handle feature branches that span multiple releases?
5. [ ] Support forSVN? (probably no, keep it Git-only)

---

*Created: 2026-02-19*
