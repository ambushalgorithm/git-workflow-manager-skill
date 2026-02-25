# ⚠️🚧 UNDER CONSTRUCTION 🚧⚠️

This repository is actively being worked on and is not meant for use until features are completed. Use at your own risk!

---

# Git Workflow Manager

**Built with:** minimax-m2.5:cloud  
**OpenClaw:** v2026.2+

Manage complex Git branching workflows for AI agents. Handles branch lifecycle, upstream syncing, PR tracking, and automated maintenance for both open source (fork) and closed source (internal) repositories.

## Why This Skill?

AI agents need a consistent, safe way to manage Git operations without breaking things. This skill provides:

- **Safety** — Never force push to protected branches, always use `--force-with-lease`
- **Consistency** — Same workflow across every repo
- **Visibility** — Track which commits are PR-ready vs internal-only
- **Automation** — Daily reports, upstream PR monitoring

## Features

- **Auto-detect repo type** — Fork vs internal detection
- **Full branch hierarchy** — master → staging → integration → develop
- **Smart sync** — Rebase or merge strategy (configurable)
- **Commit tracking** — Mark commits as PR-ready or internal-only
- **Daily PR monitoring** — Check upstream PR status automatically
- **Cherry-pick workflow** — Select commits for upstream PRs
- **Status reporting** — Full branch and PR status reports

## Quick Start

```bash
# Initialize workflow on a repo
git-workflow init

# Create a feature branch
git-workflow create feat my-new-feature

# Sync staging with master
git-workflow sync staging

# Check full status
git-workflow status
```

## Branch Hierarchy

### Internal Repos
```
master → staging → integration → develop
                   ↓
              feature/* (from develop)
```

### Fork Repos
```
upstream/master → master → staging → integration → develop
                                        ↓
                                   feature/*
```

## Commands

### Init & Config
| Command | Description |
|---------|-------------|
| `git-workflow init` | Auto-detect and setup workflow |
| `git-workflow config` | Show current configuration |

### Branch Operations
| Command | Description |
|---------|-------------|
| `git-workflow create feat <name>` | Create feature branch |
| `git-workflow create hotfix <name>` | Create hotfix branch |
| `git-workflow create release <name>` | Create release branch |
| `git-workflow delete <branch>` | Delete a branch |
| `git-workflow merge <branch>` | Merge branch into current |

### Sync Operations
| Command | Description |
|---------|-------------|
| `git-workflow sync staging` | Rebase staging onto master |
| `git-workflow sync develop` | Rebase develop onto staging |
| `git-workflow sync all` | Sync entire hierarchy |

### Update Operations
| Command | Description |
|---------|-------------|
| `git-workflow strategy get` | Show merge strategy |
| `git-workflow strategy set rebase` | Set default to rebase |
| `git-workflow update <branch> <onto>` | Smart update with strategy |
| `git-workflow status-branch` | Check sync status |
| `git-workflow ff <branch> <to>` | Fast-forward branch |

### Commit Tracking
| Command | Description |
|---------|-------------|
| `git-workflow tag <hash> pr-ready` | Mark commit PR-ready |
| `git-workflow tag <hash> internal` | Mark commit internal-only |
| `git-workflow pr-ready` | List PR-ready commits |
| `git-workflow internal` | List internal-only commits |
| `git-workflow diff` | Show staging vs integration diff |

### Daily & Reporting
| Command | Description |
|---------|-------------|
| `git-workflow daily` | Run daily check + report |
| `git-workflow prs` | List open PRs |
| `git-workflow upstream` | Check upstream status |
| `git-workflow blockers` | Show blockers |
| `git-workflow attention` | Show branches needing attention |

## Merge Strategy

Configure how branches update:

```bash
# Default: rebase for all branches
git-workflow strategy set rebase

# Default: merge for all branches  
git-workflow strategy set merge

# Branch-specific
git-workflow strategy set rebase develop
git-workflow strategy set merge staging
```

## Commit Tags

Track which commits are intended for upstream PRs:

```bash
# Mark commit as PR-ready
git-workflow tag abc1234 pr-ready

# Mark commit as internal-only
git-workflow tag abc1234 internal

# List PR-ready commits
git-workflow pr-ready

# Show diff between staging and integration
git-workflow diff
```

## Daily Report

Run automatically or on-demand:

```bash
git-workflow daily
```

Output:
```
=== Git Workflow Daily ===
Repo: my-project (Internal)
Date: 2026-02-24

BRANCH STATUS:
✓ master - synced
✓ staging - 2 commits ahead
✓ integration - 1 commit ahead (1 PR open)
✓ develop - synced with staging

NEEDS ATTENTION:
- feat/new-feature is 3 commits behind develop

BLOCKERS:
- None
```

## Requirements

- Node.js 18+
- Git
- For GitHub PR features: `gh` CLI authenticated

## Installation

```bash
# For OpenClaw
cp -r git-workflow-manager ~/Projects/openclaw-skills/

# For standalone CLI
npm install -g git-workflow-manager
```

## Documentation

- [TODO.md](docs/TODO.md) - Implementation plan
- [DESIGN.md](docs/DESIGN.md) - Architecture decisions
- [Requirements](docs/requirements/) - Detailed requirements

## License

MIT
