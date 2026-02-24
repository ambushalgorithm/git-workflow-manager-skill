# Git Workflow Manager

**Built with:** minimax-m2.5:cloud  
**OpenClaw:** v2026.2+

Manage complex Git branching workflows for open source (fork) and closed source (internal) repositories. Handles branch lifecycle, upstream syncing, PR tracking, and automated maintenance.

## Features

- **Auto-detect repo type** - Fork vs internal repo detection
- **Full branch hierarchy** - master, staging, integration, develop, release, hotfix, feature
- **Smart sync** - Rebase or merge strategies
- **Commit tracking** - Track PR-ready vs internal-only commits
- **Daily PR monitoring** - Check upstream PR status automatically
- **Cherry-pick workflow** - Select commits for upstream PRs
- **Status reporting** - Daily branch and PR status reports

## Quick Start

```bash
# Initialize workflow on a repo
git-workflow init

# Sync branches
git-workflow sync all

# Create feature branch
git-workflow create feat/new-feature

# Check status
git-workflow status
```

## Documentation

- [TODO.md](docs/TODO.md) - Implementation plan
- [DESIGN.md](docs/DESIGN.md) - Architecture decisions (TBD)

## Installation

Copy to your OpenClaw skills directory:
```bash
cp -r git-workflow-manager ~/Projects/openclaw-skills/
```

## License

MIT
