---
name: git-workflow-manager
description: Manage complex Git branching workflows for open source (fork) and closed source (internal) repositories. Handles branch lifecycle, upstream syncing, PR tracking, and automated maintenance.
---

# Git Workflow Manager

A skill for managing Git branching workflows across open source forks and internal repositories.

## Branch Hierarchy

### Open Source (Fork)
```
upstream/master
        ↑
origin/master   ← synced with upstream
        ↑
origin/staging ← ALL changes (PR'd + non-PR'd)
        ↑
origin/integration ← PR-ready subset
        ↑
origin/develop ← rebased working base
        ↑
origin/release/x.x.x
origin/hotfix/*
origin/feat/*
```

### Closed Source (Internal)
```
master
        ↑
staging ← ALL changes
        ↑
integration ← PR-ready
        ↑
develop ← rebased working base
        ↑
release/x.x.x
hotfix/*
feat/*
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `git-workflow init` | Auto-detect repo type and setup branches |
| `git-workflow sync staging` | Rebase staging onto master |
| `git-workflow sync develop` | Rebase develop onto staging |
| `git-workflow create feat/name` | Create feature branch off develop |
| `git-workflow create hotfix/name` | Create hotfix branch off staging |
| `git-workflow prepare-pr` | Cherry-pick PR-ready commits to integration |
| `git-workflow status` | Show full branch and PR status |
| `git-workflow daily` | Run daily check + report |

## Usage

### Initializing a Repo

```bash
# Auto-detect and setup (recommended)
git-workflow init

# Force fork mode
git-workflow init --type fork

# Force internal mode
git-workflow init --type internal
```

### Syncing Branches

```bash
# Sync all branches
git-workflow sync all

# Sync specific branch
git-workflow sync staging
git-workflow sync develop
```

### Creating Branches

```bash
# Feature branch (off develop)
git-workflow create feat/new-login

# Hotfix branch (off staging)
git-workflow create hotfix/security-fix

# Release branch (off staging)
git-workflow create release/1.2.0
```

### Rebasing

```bash
# Rebase current feature onto develop
git-workflow rebase

# Rebase feature onto staging
git-workflow rebase staging
```

### PR Management

```bash
# List PR-ready commits
git-workflow list-pr

# Prepare commits for upstream PR (cherry-pick to integration)
git-workflow prepare-pr

# Show full status
git-workflow status
```

### Daily Automation

```bash
# Run daily check + report
git-workflow daily

# Check upstream PR status only
git-workflow check-upstream
```

## Commit Tracking

Commits are tagged with status:
- `pr-ready` - intended for upstream PR
- `internal-only` - never going upstream
- `pending` - undecided

```bash
# View tracked commits:
git-workflow commits list

# Commits tagged as PR-ready:
git-workflow commits list pr-ready

# Commits tagged as internal-only:
git-workflow commits list internal-only

# Commits pending decision:
git-workflow commits list pending
```

## Configuration

Config stored in `.git/workflow.json`:

```json
{
  "version": "1.0",
  "type": "fork",
  "upstream": {
    "remote": "upstream",
    "url": "https://github.com/openclaw/openclaw.git"
  },
  "branches": {
    "staging": "staging",
    "integration": "integration",
    "develop": "develop"
  }
}
```

## Dependencies

- `git` - Core functionality
- `gh` (GitHub CLI) - PR operations
- `jq` - JSON processing
