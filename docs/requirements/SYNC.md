# SYNC - Sync Operations

> Detailed requirements for sync operations. See [INDEX.md](INDEX.md).

---

## SYNC-001: Fetch Latest

```typescript
async function fetchAll(): Promise<void>
```

**Acceptance Criteria:**
- [ ] Fetches from all remotes
- [ ] Fetches all branches
- [ ] Prunes deleted remote branches

**Error Cases:**
- Network error → throw `Error: Fetch failed. Check network connection.`

---

## SYNC-002: Rebase Staging onto Master

```typescript
async function syncStaging(): Promise<SyncResult>
interface SyncResult {
  success: boolean
  conflicts?: string[]
  commitsAhead: number
}
```

**Acceptance Criteria:**
- [ ] Checks out staging
- [ ] Rebases onto master
- [ ] Reports number of commits ahead
- [ ] Detects conflicts

**Error Cases:**
- Master branch doesn't exist → throw `Error: master branch required`
- Conflict detected → return `{success: false, conflicts: [...]}`, don't auto-abort

---

## SYNC-003: Rebase Develop onto Staging

```typescript
async function syncDevelop(): Promise<SyncResult>
```

**Acceptance Criteria:**
- [ ] Same as SYNC-002 but staging → develop
- [ ] Reports commits ahead/behind

**Error Cases:**
- Staging doesn't exist → throw `Error: staging branch required`

---

## SYNC-004: Rebase Feature Branch

```typescript
async function rebaseBranch(branch: string, onto: string): Promise<SyncResult>
```

**Acceptance Criteria:**
- [ ] Rebases specified branch onto target
- [ ] Uses `--onto` for correct base
- [ ] Handles upstream rebase correctly

**Error Cases:**
- Branch doesn't exist → throw `Error: Branch '${branch}' does not exist`

---

## SYNC-005: Force Push with Lease

```typescript
async function forcePush(branch: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] Uses `--force-with-lease` for safety
- [ ] Fails if remote has new commits user hasn't seen

**Error Cases:**
- Remote has new commits → throw `Error: Remote has new commits. Fetch first.`

---

## SYNC-006: Merge Strategy

```typescript
type SyncStrategy = 'rebase' | 'merge'

async function syncBranch(branch: string, strategy?: SyncStrategy): Promise<SyncResult>
```

**Acceptance Criteria:**
- [ ] Default strategy from config
- [ ] Override with flag
- [ ] Merge creates merge commit, rebase doesn't

**Error Cases:**
- Merge conflict → return conflicts, don't auto-resolve

---

## SYNC-007: Detect Conflicts

```typescript
async function detectConflicts(): Promise<ConflictInfo[]>
interface ConflictInfo {
  file: string
  branches: string[]
}
```

**Acceptance Criteria:**
- [ ] Returns list of files in conflict
- [ ] Identifies which branches have conflict

---

## SYNC-008: Abort Rebase

```typescript
async function abortRebase(): Promise<void>
```

**Acceptance Criteria:**
- [ ] Aborts in-progress rebase
- [ ] Cleans up state

---

## SYNC-009: Sync All Branches

```typescript
async function syncAll(): Promise<SyncSummary>
interface SyncSummary {
  synced: string[]
  failed: string[]
  conflicts: ConflictInfo[]
}
```

**Acceptance Criteria:**
- [ ] Syncs master → staging → develop in order
- [ ] Reports each branch result
- [ ] Continues even if one fails

---

*See [PR.md](PR.md) for PR preparation.*
