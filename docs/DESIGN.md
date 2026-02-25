# Git Workflow Manager - Design

## Overview

The Git Workflow Manager is an OpenClaw skill that helps AI agents manage complex Git branching workflows for both open source (fork) and closed source (internal) repositories.

## Architecture

### Core Modules

```
src/
├── index.ts          # CLI entry point (commander)
├── types.ts          # TypeScript interfaces
└── lib/
    ├── git.ts        # Git command wrappers
    ├── repo.ts       # Repo detection & config
    ├── create.ts     # Branch creation
    ├── sync.ts       # Branch syncing
    ├── rebase.ts     # Rebase operations
    ├── commits.ts    # Commit tracking
    ├── daily.ts      # Daily reports
    └── updates.ts    # Merge/rebase strategies
```

### Data Flow

1. **CLI Input** → `index.ts` (commander)
2. **Validation** → Load config via `repo.ts`
3. **Git Operations** → Execute via `git.ts`
4. **Output** → Console results

### Configuration

Stored in `.git/workflow-config.json`:

```json
{
  "repoType": "internal",
  "defaultBranch": "main",
  "upstreamRemote": "upstream",
  "createdAt": "2026-02-19T...",
  "branchPrefixes": {
    "feature": "feat/",
    "hotfix": "hotfix/",
    "release": "release/"
  },
  "mergeStrategy": {
    "default": "rebase",
    "perBranch": {
      "develop": "rebase",
      "staging": "merge"
    }
  },
  "tracking": {
    "commits": [...]
  }
}
```

## Design Decisions

### 1. Strategy Pattern for Merge/Rebase

**Decision:** Use configurable strategy per branch  
**Rationale:** Different teams prefer different workflows. Some rebases develop, others merge.

```typescript
// Example
mergeStrategy: {
  default: 'rebase',
  perBranch: { 'staging': 'merge' }
}
```

### 2. Commit Metadata in Config File

**Decision:** Store commit tags in `.git/workflow-config.json`  
**Rationale:** Simple, no database needed, travels with repo

**Alternative considered:** Git notes or tags — too visible, might confuse other tools

### 3. Rebase vs Merge Default

**Decision:** Default to `rebase` for clean history  
**Rationale:** Most modern teams prefer linear history

### 4. Safe Force Pushes

**Decision:** Always use `--force-with-lease`  
**Rationale:** Prevents overwriting others' work

### 5. Mockable Git Operations

**Decision:** All git commands go through `git.ts` module  
**Rationale:** Easy to unit test without real git repos

## Branch Hierarchy

### Internal Repo
```
master → staging → integration → develop
                   ↓
              feature/*
              hotfix/*
              release/*
```

### Fork Repo
```
upstream/master → master → staging → integration → develop
                                             ↓
                                        feature/*
```

## Testing Strategy

### Unit Tests
- Mock git commands via Jest
- Test business logic in isolation
- Target: ≥95% line coverage

### E2E Tests
- Run in Docker container
- Test full CLI workflows
- Create temp git repos

## Future Considerations

### Potential Features
1. **Multiple upstreams** — Handle repos with more than one upstream
2. **GitHub API integration** — Use GitHub API instead of `gh` CLI
3. **Hook system** — Run custom scripts on branch events
4. **Stash integration** — Auto-stash changes before rebase

### Portability
- Python version planned for non-Node.js environments
- Core logic separated into `lib/` for easy porting

---

*Last updated: 2026-02-24*
