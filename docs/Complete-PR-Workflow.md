# Complete PR Workflow Guide

This document describes the full workflow for creating, managing, and merging PRs using git-workflow-manager.

---

## Overview

The git-workflow-manager provides a structured approach to managing feature branches through the PR lifecycle:

1. **Start** → Create feature from synced develop
2. **Work** → Make commits, keep synced
3. **Prepare** → Tag commits as `pr-ready` or `internal-only`
4. **Create PR Branch** → Cherry-pick pr-ready commits
5. **Create PR** → Open PR to upstream or origin
6. **Handle Feedback** → Sync, update, push changes
7. **Merge** → Merge and cleanup

---

## Phase 1: Start a Feature

Always start from a clean, synced state:

```bash
# Sync in order: staging → main, then develop → staging
git-workflow sync staging
git-workflow sync develop

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
# Fetch latest from all remotes
git-workflow sync develop

# Rebase your feature onto latest develop
git-workflow rebase develop
```

---

## Phase 3: Prepare for PR

When your feature is ready for review, tag your commits:

### Tag Commits

```bash
# For commits that will go upstream (open source):
git-workflow tag <commit-hash> pr-ready

# For commits that stay internal (not shared):
git-workflow tag <commit-hash> internal-only
```

### View Tagged Commits

```bash
# View commits marked for upstream
git-workflow pr-ready

# View commits marked as internal-only
git-workflow internal

# View all tracked commits
git-workflow commits
```

---

## Phase 4: Create PR Branch

Create a dedicated PR branch with only your `pr-ready` commits:

```bash
git-workflow pr-branch create my-feature
```

**What this does:**
1. Reads all commits tagged as `pr-ready` from config
2. Creates new branch `my-feature-pr` from `integration`
3. Cherry-picks each pr-ready commit
4. Pushes to remote

**If cherry-pick conflicts occur:**
- Resolve conflicts manually
- Run `git-workflow rebase --continue`
- The command will fail gracefully and clean up

---

## Phase 5: Create the PR

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
- ✅ PR branch created from pr-ready commits

## Breaking Changes
[None]

## Related
- Branch: [branch-name]
- Base: [base-branch]
```

### Fork Detection

The tool auto-detects your repo type:

| Repo Type | Detection | PR Target |
|-----------|-----------|-----------|
| **Fork** | Has `upstream` remote | `upstream/main` |
| **Internal** | No `upstream` remote | `origin/staging` |

### Manual Alternative

```bash
# For forks
gh pr create --base main --head my-feature-pr \
  --title "Feature Title" --body "Description" \
  --repo upstream-org/upstream-repo

# For internal
gh pr create --base staging --head my-feature-pr \
  --title "Feature Title" --body "Description"
```

---

## Phase 6: Handle PR Feedback

When reviewers request changes:

```bash
# 1. Sync your working branch from develop
git-workflow pr sync develop

# 2. Make your changes
git commit --amend -m "feat: fix login validation"
# or
git commit -m "feat: address review feedback"

# 3. Re-tag the commit if needed
git-workflow tag <new-commit-hash> pr-ready

# 4. Update PR branch with new commits
git-workflow pr-branch update my-feature

# 5. Push is automatic (force push)
```

### PR Sync Details

`git-workflow pr sync`:
1. Fetches latest from all remotes
2. Checks out target branch (develop by default)
3. Pulls latest changes
4. Checks out your feature branch
5. Rebases onto the target branch

---

## Phase 7: Merge

Once approved:

```bash
# Merge via GitHub CLI
gh pr merge my-feature-pr --squash --delete-branch

# Or via web UI (recommended for protected branches)
```

### Cleanup After Merge

```bash
# Sync to get the merge
git-workflow sync staging
git-workflow sync develop

# Delete local feature branch
git branch -d feat/my-feature

# Delete remote PR branch (if not auto-deleted)
git push origin --delete my-feature-pr
```

---

## Visual Flow

```
main ←─────────────────────────┐
  ↑                           │
staging ←─────────────────────┤ (git-workflow sync staging)
  ↑                           │
develop ←────────────────────┐│ (git-workflow sync develop)
  ↑                          ││
feat/my-feature ←────────────┘│ (git-workflow rebase develop)
         │
         ├── pr-ready commits ──→ my-feature-pr ──→ PR → upstream/main
         │
         └── internal-only ──→ stays local
```

---

## Command Reference

| Phase | Command | Description |
|-------|---------|-------------|
| **Sync** | `git-workflow sync staging` | Sync staging from main |
| **Sync** | `git-workflow sync develop` | Sync develop from staging |
| **Rebase** | `git-workflow rebase develop` | Rebase feature onto develop |
| **Create** | `git-workflow create feat/name` | Create feature branch |
| **Tag** | `git-workflow tag <hash> pr-ready` | Mark commit for upstream |
| **Tag** | `git-workflow tag <hash> internal-only` | Mark commit as internal |
| **View** | `git-workflow pr-ready` | List pr-ready commits |
| **View** | `git-workflow internal` | List internal-only commits |
| **PR Branch** | `git-workflow pr-branch create <name>` | Create PR branch |
| **PR Branch** | `git-workflow pr-branch update <name>` | Update PR branch |
| **PR Branch** | `git-workflow pr-branch list` | List PR branches |
| **PR** | `git-workflow pr create <branch>` | Create PR |
| **PR** | `git-workflow pr create <branch> --dry-run` | Preview PR template |
| **PR** | `git-workflow pr sync [branch]` | Sync after feedback |
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

If `pr sync` or `rebase develop` fails:

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

1. **Sync often** - Run `git-workflow sync develop` and `git-workflow rebase develop` regularly
2. **Tag early** - Tag commits as `pr-ready` when ready, not at the end
3. **Small PRs** - Few, focused commits are easier to review
4. **Keep internal separate** - Use `internal-only` for internal-only changes
5. **Clean branches** - Delete merged branches promptly
