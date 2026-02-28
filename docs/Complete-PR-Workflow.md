# Complete PR Workflow Guide

This document describes the full workflow for creating, managing, and merging PRs using git-workflow-manager.

---

## Overview

The git-workflow-manager provides a structured approach to managing feature branches through the PR lifecycle:

1. **Start** → Create feature from synced develop
2. **Work** → Make commits, keep synced
3. **Prepare** → Create PR branch when ready
4. **Create PR** → Open PR to staging (always)
5. **Handle Feedback** → Sync, update, push changes
6. **Merge** → Merge and cleanup

---

## Phase 1: Start a Feature

Always start from a clean, synced state:

```bash
# For forks: sync master from upstream first
git-workflow sync master

# Rebase develop onto staging
git-workflow rebase develop staging

# Create feature branch from develop
git-workflow create feat/my-feature
```

Or manually:

```bash
git checkout -b feat/my-feature develop
```

---

## Phase 2: Work on Your Feature

Make commits as you work:

```bash
git add .
git commit -m "feat: add login form"
```

### Keep Synced Periodically

```bash
# Rebase your feature onto latest develop
git-workflow rebase develop staging
```

---

## Phase 3: Prepare for PR

When your feature is ready for review, create a PR branch:

```bash
git-workflow pr-branch create my-feature
```

**What this does:**
1. Creates new branch `my-feature-pr` from `staging`
2. Cherry-picks commits from your feature branch
3. Pushes to remote

---

## Phase 4: Create the PR

All PRs target `staging`:

```bash
# Preview PR template (fill in manually or with AI)
git-workflow pr create my-feature --dry-run

# Use the template, fill it out and use it to create the PR
git-workflow pr create my-feature -t "Feature Title From Template" -b "Custom description based on template"
```

### PR Template (--dry-run)

When using `--dry-run`, you'll get an empty template to fill in:

```markdown
### AI/Vibe-Coded Disclosure 🤖
- [x] **AI-assisted:** Built with [Model] + [AI-agent e.g., OpenClaw] [version]
- [x] **Testing level:** [e.g., Fully tested (N tests)]
- [x] **Code understanding:** Yes — reviewed for compliance with [Project] standards

# Summary
[2-3 sentence overview of what this PR does]

## What
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]

## Why
[Why this change matters - what problem does it solve? What does it enable?]

## Technical Changes
| File | Change |
|------|--------|
| file1.py | [Change description] |
| file2.ts | [Change description] |

## Testing
- ✅ [Test 1]
- ✅ [Test 2]

## Breaking Changes
[None or describe any breaking changes]

## Related
[Any related PRs, issues, or context]
```

After filling in the template, create the PR:
```bash
git-workflow pr create my-feature -t "my-feature" -b "<paste filled template>"
```

### Auto-Generated Description

When you provide a body (without `--dry-run`), the tool auto-generates a PR description from your commits:

```markdown
### AI/Vibe-Coded Disclosure 🤖
- [x] **AI-assisted:** Built with [Model] + [AI-agent e.g., OpenClaw] [version]
- [x] **Testing level:** [e.g., Fully tested (N tests)]
- [x] **Code understanding:** Yes — reviewed for compliance with [Project] standards

# Summary
[Overview of changes]

## What
- [Bullet points from commit messages]

## Why
[Why these changes matter]

## Technical Changes
| File | Change |
|------|--------|
| Multiple | N commit(s) in PR branch |

## Testing
- ✅ PR branch created

## Breaking Changes
[None]

## Related
- Branch: [branch-name]
- Base: staging
```

### PR Target

All PRs target `staging` — both for forks and internal repos:

| Repo Type | Detection | PR Target |
|-----------|-----------|-----------|
| **Fork** | Has `upstream` remote | `staging` |
| **Internal** | No `upstream` remote | `staging` |

---

## Phase 5: Handle PR Feedback

When reviewers request changes:

```bash
# 1. Rebase your working branch onto latest develop
git-workflow rebase develop staging

# 2. Make your changes
git commit --amend -m "feat: fix login validation"
# or
git commit -m "feat: address review feedback"

# 3. Update PR branch with new commits
git-workflow pr-branch update my-feature

# 4. Push is automatic (force push)
```

---

## Phase 6: Merge

Once approved:

```bash
# Merge via GitHub CLI
gh pr merge my-feature-pr --squash --delete-branch

# Or via web UI (recommended for protected branches)
```

### Merge to Master

After merging to staging, sync to propagate changes:

```bash
# Rebase develop onto staging, then master
git-workflow rebase develop staging
git-workflow rebase master staging
git push origin master
```

**Flow:**
```
feat/* → feat/*-pr → PR → staging → develop → master
```

### Cleanup After Merge

```bash
# Sync to get the merge
git fetch --all

# Delete local feature branch
git branch -d feat/my-feature

# Delete remote PR branch (if not auto-deleted)
git push origin --delete my-feature-pr
```

---

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

---

## Command Reference

| Phase | Command | Description |
|-------|---------|-------------|
| **Sync** | `git-workflow sync master` | Sync master from upstream (forks only) |
| **Rebase** | `git-workflow rebase <branch> <target>` | Rebase branch onto target |
| **Create** | `git-workflow create feat/name` | Create feature branch |
| **PR Branch** | `git-workflow pr-branch create <name>` | Create PR branch |
| **PR Branch** | `git-workflow pr-branch update <name>` | Update PR branch |
| **PR Branch** | `git-workflow pr-branch list` | List PR branches |
| **PR** | `git-workflow pr create <branch>` | Create PR |
| **PR** | `git-workflow pr create <branch> --dry-run` | Preview PR template |
| **Status** | `git-workflow status` | Show current status |
| **Daily** | `git-workflow daily` | Run daily check |

---

## Troubleshooting

### Cherry-pick Conflicts

If `pr-branch create` fails due to conflicts:

```bash
# Resolve conflicts in files
git add <resolved-files>

# Continue cherry-pick
git cherry-pick --continue

# Or abort if too messy
git cherry-pick --abort

# Then retry the command
git-workflow pr-branch create my-feature
```

### Rebase Conflicts

If `rebase` fails:

```bash
# Resolve conflicts
git add <resolved-files>

# Continue rebase
git-workflow rebase --continue

# Or abort
git-workflow rebase --abort
```

### Lost Commits

If you accidentally lose commits:

```bash
# Find lost commits
git reflog

# Recover commit
git checkout -b recovery-branch <commit-hash>
```

---

## Best Practices

1. **Sync often** - Run `git-workflow rebase develop staging` regularly
2. **Small PRs** - Few, focused commits are easier to review
3. **Clean branches** - Delete merged branches promptly
