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
| `git-workflow init` | Initialize workflow on repository |
| `git-workflow detect` | Detect repository type (fork or internal) |
| `git-workflow sync [branch]` | Sync branches in the workflow hierarchy |
| `git-workflow create <type> <name>` | Create a new feature, hotfix, or release branch |
| `git-workflow rebase [parent]` | Rebase current branch onto parent |
| `git-workflow status` | Show current workflow status |
| `git-workflow tag <hash> <status>` | Tag a commit with status (pr-ready, internal-only, pending) |
| `git-workflow pr-ready` | List commits tagged as pr-ready |
| `git-workflow internal` | List commits tagged as internal-only |
| `git-workflow commits` | List all tracked commits |
| `git-workflow diff` | Show diff between staging and integration |
| `git-workflow daily` | Run daily check and generate report |
| `git-workflow prs` | List open pull requests |
| `git-workflow upstream` | Check upstream status (for forks) |
| `git-workflow blockers` | Show blockers |
| `git-workflow attention` | Show branches needing attention |
| `git-workflow strategy [action] [strategy] [branch]` | Set or show merge strategy |
| `git-workflow update <branch> [onto]` | Update branch to latest (uses strategy) |
| `git-workflow status-branch [branch]` | Show branch sync status |
| `git-workflow ff <branch> <to>` | Fast-forward branch to target |
| `git-workflow update-children <baseBranch>` | Update child branches after parent merge |

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
git-workflow pr-ready

# List internal-only commits
git-workflow internal

# List all tracked commits
git-workflow commits

# List open pull requests
git-workflow prs

# Show full status
git-workflow status
```

### Daily Automation

```bash
# Run daily check + report
git-workflow daily

# Check upstream PR status only
git-workflow upstream
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
