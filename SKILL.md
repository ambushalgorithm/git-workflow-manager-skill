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
origin/master            ← synced with upstream
        ↑
origin/staging           ← ALL changes (PR'd to upstream)
        ↑
origin/develop           ← rebased working base
        ↑
origin/release/x.x.x
origin/hotfix/*
origin/feat/*
```

### Closed Source (Internal)
```
     master
        ↑
     staging        ← ALL changes
        ↑
     develop        ← rebased working base
        ↑
     release/x.x.x
     hotfix/*
     feat/*
```

## Commands

| Category | Command | Description |
|----------|---------|-------------|
| **Init** | `git-workflow init` | Auto-detect and setup workflow |
| **Sync** | `git-workflow sync master` | Sync master from upstream (forks only) |
| **Rebase** | `git-workflow rebase <branch> <target>` | Rebase branch onto target |
| **Create** | `git-workflow create feat <name>` | Create feature branch |
| **Create** | `git-workflow create hotfix <name>` | Create hotfix branch |
| **Create** | `git-workflow create release <name>` | Create release branch |
| **PR Branch** | `git-workflow pr-branch create <name>` | Create PR branch |
| **PR Branch** | `git-workflow pr-branch update <name>` | Update PR branch |
| **PR Branch** | `git-workflow pr-branch list` | List PR branches |
| **PR** | `git-workflow pr create <branch>` | Create PR (targets staging) |
| **PR** | `git-workflow pr create <branch> --dry-run` | Preview PR template |
| **Status** | `git-workflow status` | Show current status |
| **Daily** | `git-workflow daily` | Run daily check and report |
| **PRs** | `git-workflow prs` | List open pull requests |
| **Blockers** | `git-workflow blockers` | Show blockers |

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
# For forks: sync master from upstream
git-workflow sync master
```

### Rebasing

```bash
# Rebase develop onto staging
git-workflow rebase develop staging

# Rebase feature onto develop
git-workflow rebase feat/my-feature develop

# Rebase current branch onto develop
git-workflow rebase develop staging

# Continue after resolving conflicts
git-workflow rebase --continue

# Abort rebase
git-workflow rebase --abort
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

### PR Workflow

```bash
# Create PR branch from feature branch
git-workflow pr-branch create my-feature

# Create the PR (always targets staging)
git-workflow pr create my-feature -t "Feature Title" -b "Description"

# Preview PR template
git-workflow pr create my-feature --dry-run
```

### Daily Report

```bash
# Run daily check + report
git-workflow daily
```

Output:
```
=== Git Workflow Daily ===
Repo: my-project (Internal)
Date: 2026-02-28

BRANCH STATUS:
✓ master - synced
✓ staging - 2 commits ahead
✓ develop - synced with staging

NEEDS ATTENTION:
- feat/new-feature is 3 commits behind develop

BLOCKERS:
- None
```

## PR Options

| Option | Description |
|--------|-------------|
| `-a, --author <user>` | Filter by author |
| `-A, --assignee <user>` | Filter by assignee |
| `-b, --base <branch>` | Filter by base branch |
| `-l, --label <label>` | Filter by label |
| `-s, --state <state>` | Filter by state: open, closed, merged, all |
| `-L, --limit <num>` | Limit number of results (default: 30) |

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
    "develop": "develop"
  }
}
```

## Full Workflow Guide

For a complete step-by-step guide from feature creation to PR merge, see:

**[docs/Complete-PR-Workflow.md](docs/Complete-PR-Workflow.md)**

## Dependencies

- `git` - Core functionality
- `gh` (GitHub CLI) - PR operations
- `jq` - JSON processing
