# Git Workflow Manager - Requirements

**Version:** 1.0  
**Language-Agnostic:** Yes  
**Current Implementation:** TypeScript  
**Port TODO:** Python

---

## Overview

A universal Git workflow management tool for AI agents. Handles complex branching workflows across open source (fork) and closed source (internal) repositories. Works with any programming language, any repo type.

## Quick Reference

| Command | Description |
|---------|-------------|
| `init` | Initialize workflow on repo |
| `sync <branch>` | Sync branch to parent |
| `sync all` | Sync entire branch hierarchy |
| `create <type> <name>` | Create new branch |
| `rebase [branch]` | Rebase current or specified branch |
| `prepare-pr` | Cherry-pick commits to integration branch |
| `status` | Show full branch and PR status |
| `daily` | Run daily check and report |

## Repo Types

- **Open Source (Fork):** Has `upstream` remote
- **Closed Source (Internal):** No upstream remote

## Testing

- **Unit tests:** Required for all features
- **E2E tests:** Fork workflow + Internal workflow

## Related Docs

| Doc | Contents |
|-----|----------|
| [REQUIREMENTS-FEATURES.md](REQUIREMENTS-FEATURES.md) | All numbered requirements |
| [REQUIREMENTS-CLI.md](REQUIREMENTS-CLI.md) | CLI commands + data structures |
| [REQUIREMENTS-TESTING.md](REQUIREMENTS-TESTING.md) | Testing requirements |
| [REQUIREMENTS-PORTING.md](REQUIREMENTS-PORTING.md) | Porting notes + future |
| [requirements/](requirements/INDEX.md) | Detailed function signatures + acceptance criteria |

---

*Last Updated: 2026-02-19*
