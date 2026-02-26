# ⚠️🚧 UNDER CONSTRUCTION 🚧⚠️

This repository is actively being worked on and is not meant for use until features are completed. Use at your own risk!

---

# Git Workflow Manager

**Built with:** minimax-m2.5:cloud  
**OpenClaw:** v2026.2+

Manage complex Git branching workflows for AI agents. Handles branch lifecycle, upstream syncing, PR tracking, and automated maintenance.

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

## Why This Skill?

AI agents need a consistent, safe way to manage Git operations without breaking things:

- **Safety** — Never force push to protected branches
- **Consistency** — Same workflow across every repo
- **Visibility** — Track which commits are PR-ready vs internal-only
- **Automation** — Daily reports, upstream PR monitoring

## Quick Start

```bash
# Initialize workflow on a repo
git-workflow init

# Create a feature branch
git-workflow create feat my-new-feature

# Sync with master
git-workflow sync staging

# Check status
git-workflow status
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

## Full Documentation

For complete command reference, usage examples, and technical details, see:

**[SKILL.md](SKILL.md)** — The authoritative reference for this skill.

## Requirements

- Node.js 18+
- Git
- For GitHub PR features: `gh` CLI authenticated

## Installation

```bash
# For OpenClaw
git clone https://github.com/ambushalgorithm/git-workflow-manager-skill.git ~/path/to/skills/git-workflow-manager

# For standalone CLI
npm install -g git-workflow-manager
```

## License

MIT
