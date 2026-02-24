# Git Workflow Manager - Features

> All numbered requirements. See [REQUIREMENTS.md](REQUIREMENTS.md) for overview.

---

## 1. Repo Detection & Initialization

| ID | Requirement |
|----|-------------|
| REPO-001 | Detect repo type by checking for `upstream` remote |
| REPO-002 | Prompt user to confirm or override detected type |
| REPO-003 | Create full branch hierarchy automatically |
| REPO-004 | Push all branches to origin |
| REPO-005 | Set default branch (usually `develop`) |
| REPO-006 | Store config in `.git/workflow.json` |
| REPO-007 | Support `--type fork` and `--type internal` flags |

---

## 2. Branch Management

| ID | Requirement |
|----|-------------|
| BRANCH-001 | List all branches with status |
| BRANCH-002 | Create feature branches off `develop` |
| BRANCH-003 | Create hotfix branches off `staging` |
| BRANCH-004 | Create release branches off `staging` |
| BRANCH-005 | Delete branches (local and remote) |
| BRANCH-006 | Track branch relationships (parent branch) |

---

## 3. Sync Operations

| ID | Requirement |
|----|-------------|
| SYNC-001 | Fetch latest from all remotes |
| SYNC-002 | Rebase `staging` onto `master` |
| SYNC-003 | Rebase `develop` onto `staging` |
| SYNC-004 | Rebase feature branch onto parent |
| SYNC-005 | Force push with `--force-with-lease` safety |
| SYNC-006 | Support merge strategy as alternative |
| SYNC-007 | Detect and report conflicts |
| SYNC-008 | Abort rebase on conflict |
| SYNC-009 | Sync all branches in hierarchy |

---

## 4. Cherry-Pick & PR Preparation

| ID | Requirement |
|----|-------------|
| PR-001 | List commits not yet in staging |
| PR-002 | Allow selection of commits to cherry-pick |
| PR-003 | Create integration branch with selected commits |
| PR-004 | Open PR to upstream (if fork) |
| PR-005 | Open PR within same repo (if internal) |
| PR-006 | Show diff before PR |
| PR-007 | Support PR templates |

---

## 5. Commit Tracking

| ID | Requirement |
|----|-------------|
| COMMIT-001 | Tag commits with status: `pr-ready`, `internal-only`, `pending` |
| COMMIT-002 | Store commit metadata in config |
| COMMIT-003 | List all `pr-ready` commits not yet in upstream |
| COMMIT-004 | List all `internal-only` changes |
| COMMIT-005 | Show diff between staging and integration |
| COMMIT-006 | Update commit status |
| COMMIT-007 | Support tags on commits (e.g., `v1.2.0-internal`) |

---

## 6. GitHub/GitLab Integration

| ID | Requirement |
|----|-------------|
| GH-001 | Use CLI tool (`gh` or `glab`) for API calls |
| GH-002 | List open PRs with status |
| GH-003 | Show PR details (conflicts, checks, reviews) |
| GH-004 | Monitor upstream PRs (for forks) |
| GH-005 | Detect when PR is merged |
| GH-006 | Close stale branches after PR merge |
| GH-007 | Support GitHub and GitLab |

---

## 7. Daily Automation

| ID | Requirement |
|----|-------------|
| DAILY-001 | Run daily check on schedule (cron) |
| DAILY-002 | Check upstream PR status |
| DAILY-003 | Detect new commits on upstream |
| DAILY-004 | Report blockers and conflicts |
| DAILY-005 | Show branches needing attention |
| DAILY-006 | Generate daily status report |
| DAILY-007 | Send report to configured channel |

---

## 8. Auto-Update Logic

| ID | Requirement |
|----|-------------|
| AUTO-001 | Detect when upstream branch has new commits |
| AUTO-002 | Determine rebase vs merge strategy |
| AUTO-003 | Auto-update child branches after PR merge |
| AUTO-004 | Handle merge conflicts automatically if possible |
| AUTO-005 | Fall back to manual resolution if needed |

---

## 9. Configuration

| ID | Requirement |
|----|-------------|
| CONFIG-001 | Store in `.git/workflow.json` |
| CONFIG-002 | Support global config (`~/.gitworkflowrc`) |
| CONFIG-003 | Configurable branch names |
| CONFIG-004 | Configurable sync strategy (rebase/merge) |
| CONFIG-005 | Configurable default remote names |
| CONFIG-006 | Configurable daily report channel |

---

*See [REQUIREMENTS-CLI.md](REQUIREMENTS-CLI.md) for commands and data structures.*
