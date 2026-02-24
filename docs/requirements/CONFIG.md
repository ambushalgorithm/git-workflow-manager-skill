# CONFIG - Configuration

> Detailed requirements for configuration. See [INDEX.md](INDEX.md).

---

## CONFIG-001: Store in .git/workflow.json

```typescript
async function loadConfig(): Promise<WorkflowConfig>
async function saveConfig(config: WorkflowConfig): Promise<void>
```

**Acceptance Criteria:**
- [ ] Loads config from `.git/workflow.json`
- [ ] Creates default if not exists
- [ ] Validates schema on load

---

## CONFIG-002: Global Config

```typescript
async function loadGlobalConfig(): Promise<GlobalConfig>
// ~/.gitworkflowrc or ~/.config/git-workflow/config.json
```

**Acceptance Criteria:**
- [ ] Falls back to global config if no local
- [ ] Local config overrides global

---

## CONFIG-003: Configurable Branch Names

```typescript
interface BranchNames {
  master: string      // default: 'master'
  staging: string     // default: 'staging'
  integration: string // default: 'integration'
  develop: string     // default: 'develop'
  releasePrefix: string  // default: 'release/'
  hotfixPrefix: string   // default: 'hotfix/'
  featurePrefix: string  // default: 'feat/'
}
```

**Acceptance Criteria:**
- [ ] Allows customizing all branch names
- [ ] Persists across runs

---

## CONFIG-004: Configurable Sync Strategy

```typescript
type SyncStrategy = 'rebase' | 'merge'

interface SyncSettings {
  defaultStrategy: SyncStrategy
  autoSync: boolean
  syncOnPush: boolean
}
```

**Acceptance Criteria:**
- [ ] Default strategy from config
- [ ] Override per-command

---

## CONFIG-005: Configurable Remotes

```typescript
interface RemoteConfig {
  upstream: string    // default: 'upstream'
  origin: string     // default: 'origin'
  defaultRemote: string // which to use by default
}
```

**Acceptance Criteria:**
- [ ] Allows custom remote names
- [ ] Handles missing remotes gracefully

---

## CONFIG-006: Daily Report Channel

```typescript
interface ReportChannel {
  type: 'discord' | 'slack' | 'email' | 'webhook'
  target: string
  enabled: boolean
}
```

**Acceptance Criteria:**
- [ ] Configure channel type and target
- [ ] Enable/disable daily reports

---

## Full Config Schema

```typescript
interface WorkflowConfig {
  version: string
  type: 'fork' | 'internal'
  upstream?: {
    remote: string
    url: string
    defaultBranch: string
  }
  origin: {
    remote: string
    defaultBranch: string
  }
  branches: BranchNames
  remotes: RemoteConfig
  sync: SyncSettings
  daily: {
    enabled: boolean
    channel?: ReportChannel
    cron?: string
  }
  tracking: {
    commits: Record<string, CommitMetadata>
    prs: Record<string, PRMetadata>
  }
}
```

---

*See [INDEX.md](INDEX.md) for requirements index.*
