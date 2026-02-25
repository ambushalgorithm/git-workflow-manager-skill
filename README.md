# ⚠️🚧 UNDER CONSTRUCTION 🚧⚠️

This repository is actively being worked on and is not meant for use until features are completed. Use at your own risk!

---

# Git Workflow Manager

**Built with:** minimax-m2.5:cloud  
**OpenClaw:** v2026.2+

Manage complex Git branching workflows for AI agents. Handles branch lifecycle, upstream syncing, PR tracking, and automated maintenance.

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
cp -r git-workflow-manager ~/Projects/openclaw-skills/

# For standalone CLI
npm install -g git-workflow-manager
```

## License

MIT
