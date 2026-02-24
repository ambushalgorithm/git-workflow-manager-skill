# COMMITS - Commit Tracking

> Detailed requirements for commit tracking. See [INDEX.md](INDEX.md).

---

## COMMIT-001: Tag Commit with Status

```typescript
type CommitStatus = 'pr-ready' | 'internal-only' | 'pending'

async function tagCommit(hash: string, status: CommitStatus): Promise<void>
```

**Acceptance Criteria:**
- [ ] Stores status in config under `tracking.commits`
- [ ] Updates existing status if already tagged
- [ ] Validates hash exists in repo

**Error Cases:**
- Invalid hash → throw `Error: Commit '${hash}' not found`
- Invalid status → throw `Error: Invalid status. Use 'pr-ready', 'internal-only', or 'pending'`

---

## COMMIT-002: Store Commit Metadata

```typescript
interface CommitMetadata {
  status: CommitStatus
  message: string
  upstreamPr?: number
  tags: string[]
  createdAt: string
}

async function storeCommitMetadata(hash: string, metadata: Partial<CommitMetadata>): Promise<void>
```

**Acceptance Criteria:**
- [ ] Stores in `.git/workflow.json`
- [ ] Preserves existing metadata when updating

---

## COMMIT-003: List PR-Ready Commits

```typescript
async function listPRReadyCommits(): Promise<CommitInfo[]>
// returns commits with status 'pr-ready' not yet in upstream
```

**Acceptance Criteria:**
- [ ] Returns all `pr-ready` commits
- [ ] Filters out commits already in upstream

---

## COMMIT-004: List Internal-Only Changes

```typescript
async function listInternalOnlyCommits(): Promise<CommitInfo[]>
```

**Acceptance Criteria:**
- [ ] Returns all commits marked `internal-only`
- [ ] Shows which files changed

---

## COMMIT-005: Show Diff Between Staging and Integration

```typescript
async function showStagingIntegrationDiff(): Promise<string>
```

**Acceptance Criteria:**
- [ ] Returns diff of integration minus staging
- [ ] Shows commits in integration not in staging

---

## COMMIT-006: Update Commit Status

```typescript
async function updateCommitStatus(hash: string, newStatus: CommitStatus): Promise<void>
```

**Acceptance Criteria:**
- [ ] Changes status of existing tag
- [ ] Logs status change with timestamp

---

## COMMIT-007: Support Tags on Commits

```typescript
async function tagCommitMessage(hash: string, tag: string): Promise<void>
// e.g., "v1.2.0-internal"
```

**Acceptance Criteria:**
- [ ] Adds lightweight tag to commit
- [ ] Tags are local only (not pushed)

---

*See [INTEGRATION.md](INTEGRATION.md) for GitHub/GitLab integration.*
