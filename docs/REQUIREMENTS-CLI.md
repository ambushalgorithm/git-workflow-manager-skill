# Git Workflow Manager - CLI & Data Structures

> CLI commands and data structures. See [REQUIREMENTS.md](REQUIREMENTS.md) for overview.

---

## CLI Commands

### Required Commands

```
init [options]              Initialize workflow on repo
sync <branch>               Sync branch to parent
sync all                    Sync entire branch hierarchy
create <type> <name>        Create new branch
rebase [branch]             Rebase current or specified branch
prepare-pr                  Cherry-pick commits to integration branch
status                      Show full branch and PR status
daily                       Run daily check and report
```

### Optional Commands

```
branch list                 List all branches
branch delete <name>        Delete branch
commits list [--status]     List tracked commits
commits update <hash>       Update commit status
check-upstream              Check upstream PRs only
config show                 Show current config
config set <key> <value>    Update config
```

---

## Data Structures

### Workflow Config

```json
{
  "version": "1.0",
  "type": "fork",
  "upstream": {
    "remote": "upstream",
    "url": "https://github.com/owner/repo.git",
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
    "syncStrategy": "rebase",
    "autoSync": false,
    "dailyReport": true,
    "dailyReportChannel": null
  }
}
```

### Commit Tracking

```json
{
  "abc123def": {
    "status": "pr-ready",
    "message": "feat: add hook system",
    "upstreamPr": null,
    "tags": [],
    "createdAt": "2026-02-19T10:00:00Z"
  }
}
```

### PR Tracking

```json
{
  "123": {
    "localBranch": "feat/hook-system",
    "upstreamPr": 126,
    "status": "open",
    "mergeable": true,
    "checksPassing": true,
    "lastChecked": "2026-02-19T10:00:00Z"
  }
}
```

---

## Daily Report Format

```
=== Git Workflow Daily ===
Repo: owner/repo (Open Source)
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

*See [REQUIREMENTS-FEATURES.md](REQUIREMENTS-FEATURES.md) for feature requirements.*
