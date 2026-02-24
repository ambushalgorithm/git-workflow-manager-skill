# INTEGRATION - GitHub/GitLab Integration

> Detailed requirements for GitHub/GitLab integration. See [INDEX.md](INDEX.md).

---

## GH-001: Use CLI Tools

```typescript
type GitCLI = 'gh' | 'glab'

async function detectGitCLI(): Promise<GitCLI>
// returns 'gh' for GitHub, 'glab' for GitLab, or throws if neither found
```

**Acceptance Criteria:**
- [ ] Checks for `gh` CLI first (GitHub)
- [ ] Falls back to `glab` (GitLab)
- [ ] Throws if neither installed

**Error Cases:**
- Neither CLI installed → throw `Error: GitHub CLI (gh) or GitLab CLI (glab) required`

---

## GH-002: List Open PRs

```typescript
interface PRInfo {
  number: number
  title: string
  state: 'open' | 'merged' | 'closed'
  headBranch: string
  baseBranch: string
  url: string
  mergeable: boolean
  checksPassing: boolean
}

async function listOpenPRs(): Promise<PRInfo[]>
```

**Acceptance Criteria:**
- [ ] Returns all open PRs for repo
- [ ] Includes mergeable status
- [ ] Includes check status

---

## GH-003: Show PR Details

```typescript
async function getPRDetails(prNumber: number): Promise<PRDetail>
interface PRDetail extends PRInfo {
  author: string
  createdAt: string
  updatedAt: string
  reviewers: string[]
  labels: string[]
  isDraft: boolean
}
```

**Acceptance Criteria:**
- [ ] Returns full PR details
- [ ] Shows reviewers
- [ ] Shows labels

---

## GH-004: Monitor Upstream PRs (Forks)

```typescript
async function listUpstreamPRs(): Promise<PRInfo[]>
// lists PRs on upstream repo
```

**Acceptance Criteria:**
- [ ] Lists PRs on upstream (not fork)
- [ ] Useful for seeing what others have open

**Error Cases:**
- Not a fork → skip / return empty

---

## GH-005: Detect When PR is Merged

```typescript
async function checkPRMerged(prNumber: number): Promise<boolean>
```

**Acceptance Criteria:**
- [ ] Returns true if PR is merged
- [ ] Caches result to avoid API rate limits

---

## GH-006: Close Stale Branches

```typescript
async function closeStaleBranches(): Promise<void>
// closes local/remote branches after PR merge
```

**Acceptance Criteria:**
- [ ] Detects merged PRs
- [ ] Prompts before deleting branches
- [ ] Deletes both local and remote

---

## GH-007: Support GitHub and GitLab

```typescript
interface Platform {
  type: 'github' | 'gitlab'
  api: string
}

async function detectPlatform(): Promise<Platform>
```

**Acceptance Criteria:**
- [ ] Auto-detect based on remotes
- [ ] Use appropriate CLI for each
- [ ] Abstract common operations

---

*See [DAILY.md](DAILY.md) for daily automation.*
