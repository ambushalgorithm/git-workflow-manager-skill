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
origin/staging           ← ALL changes (PR'd + non-PR'd)
        ↑
origin/integration       ← PR-ready subset
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
     integration    ← PR-ready
        ↑
     develop        ← rebased working base
        ↑
     release/x.x.x
     hotfix/*
     feat/*
```

## Commands
| Command | Description |
|---------|-------------|
[command] | [description] |

| Init & Config | |
|---------|-------------|
| `git-workflow init` | Auto-detect and setup workflow |
| `git-workflow detect` | Detect repository type (fork or internal) |

| Branch Operations | |
|---------|-------------|
| `git-workflow create <type> <name>` | Create a new feature, hotfix, or release branch |
| `git-workflow create feat <name>` | Create feature branch |
| `git-workflow create hotfix <name>` | Create hotfix branch |
| `git-workflow create release <name>` | Create release branch |
| `git-workflow rebase [parent]` | Rebase current branch onto parent |

| Sync Operations | |
|---------|-------------|
| `git-workflow sync [branch]` | Sync branches (staging, develop, or all) |

| Update Operations | |
|---------|-------------|
| `git-workflow strategy [action] [strategy] [branch]` | Set or show merge strategy |
| `git-workflow update <branch> [onto]` | Update branch to latest (uses strategy) |
| `git-workflow status-branch [branch]` | Check sync status |
| `git-workflow ff <branch> <to>` | Fast-forward branch |
| `git-workflow update-children <baseBranch>` | Update child branches after parent merge |

| Commit Tracking | |
|---------|-------------|
| `git-workflow tag <hash> <status>` | Tag commit (pr-ready, internal-only, pending) |
| `git-workflow pr-ready` | List commits tagged as pr-ready |
| `git-workflow internal` | List commits tagged as internal-only |
| `git-workflow commits` | List all tracked commits |
| `git-workflow diff` | Show diff between staging and integration |

| PR Operations | |
|---------|-------------|
| `git-workflow pr-branch create <name>` | Create PR branch from pr-ready commits |
| `git-workflow pr-branch update <name>` | Update PR branch with new pr-ready commits |
| `git-workflow pr-branch list` | List active PR branches |
| `git-workflow pr create <branch>` | Create a PR |
| `git-workflow pr sync [branch]` | Sync working branch after PR feedback |

| Daily & Reporting | |
|---------|-------------|
| `git-workflow status` | Show current workflow status |
| `git-workflow daily` | Run daily check and generate report |
| `git-workflow prs` | List open pull requests with optional filters |
| `git-workflow upstream` | Check upstream status (for forks) |
| `git-workflow blockers` | Show blockers |
| `git-workflow attention` | Show branches needing attention |

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

### Configure How Branches Update

```bash
# Default: rebase for all branches
git-workflow strategy set rebase

# Default: merge for all branches  
git-workflow strategy set merge

# Branch-specific
git-workflow strategy set rebase develop
git-workflow strategy set merge staging
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
```
### PR Options

| Option | Description |
|--------|-------------|
| `-a, --author <user>` | Filter by author |
| `-A, --assignee <user>` | Filter by assignee |
| `-b, --base <branch>` | Filter by base branch |
| `-l, --label <label>` | Filter by label |
| `-s, --state <state>` | Filter by state: open, closed, merged, all |
| `-L, --limit <num>` | Limit number of results (default: 30) |
```bash
# List open pull requests
git-workflow prs

# Filter by author
git-workflow prs -a username

# Filter by base branch
git-workflow prs -b main

# Show merged PRs
git-workflow prs -s merged

# Combined filters
git-workflow prs -a username -b main -L 10
```

### PR Branch Workflow

```bash
# After making commits and tagging them as pr-ready:
git-workflow tag abc123 pr-ready

# Create PR branch from pr-ready commits
git-workflow pr-branch create my-feature

# Create the PR
git-workflow pr create my-feature -t "Feature Title" -b "Description"

# After PR feedback, sync and update
git-workflow pr sync develop
# Make changes, tag new commits
git-workflow tag def456 pr-ready
git-workflow pr-branch update my-feature
```

### Daily Automation
```bash

```bash
# Run daily check + report
git-workflow daily

# Filter by author
git-workflow daily -a username

# Filter by base branch
git-workflow daily -b main

# Show merged PRs only
git-workflow daily -s merged

# Check upstream PR status only
git-workflow upstream
```

### Daily Options

| Option | Description |
|--------|-------------|
| `-a, --author <user>` | Filter PRs by author |
| `-A, --assignee <user>` | Filter PRs by assignee |
| `-b, --base <branch>` | Filter PRs by base branch |
| `-l, --label <label>` | Filter PRs by label |
| `-s, --state <state>` | Filter PRs by state: open, closed, merged, all |
| `-L, --limit <num>` | Limit number of PRs (default: 30) |

## Commit Tracking

Commits are tagged with status:
- `pr-ready` - intended for upstream PR
- `internal-only` - never going upstream
- `pending` - undecided

```bash
# Mark commit as PR-ready
git-workflow tag abc1234 pr-ready

# Mark commit as internal-only
git-workflow tag abc1234 internal

# List PR-ready commits
git-workflow pr-ready

# Show diff between staging and integration
git-workflow diff

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

## Full Workflow Guide

For a complete step-by-step guide from feature creation to PR merge, see:

**[docs/Complete-PR-Workflow.md](docs/Complete-PR-Workflow.md)**

## Dependencies

- `git` - Core functionality
- `gh` (GitHub CLI) - PR operations
- `jq` - JSON processing
