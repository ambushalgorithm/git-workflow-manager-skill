# PR - Cherry-Pick & PR Preparation

> Detailed requirements for PR preparation. See [INDEX.md](INDEX.md).

---

## PR-001: List Commits Not in Staging

```typescript
interface CommitInfo {
  hash: string
  message: string
  author: string
  date: Date
  status: 'pr-ready' | 'internal-only' | 'pending'
}

async function listCommitsNotInStaging(branch?: string): Promise<CommitInfo[]>
// defaults to develop branch
```

**Acceptance Criteria:**
- [ ] Returns commits on branch not merged to staging
- [ ] Shows commit message, author, date
- [ ] Shows commit status from tracking

**Error Cases:**
- Branch doesn't exist → throw `Error: Branch does not exist`

---

## PR-002: Select Commits to Cherry-Pick

```typescript
interface CommitSelection {
  commits: string[] // commit hashes
}

async function selectCommitsForCherryPick(selection: CommitSelection): Promise<void>
```

**Acceptance Criteria:**
- [ ] Prompts user to select commits
- [ ] Supports selecting multiple commits
- [ ] Shows diff for each commit

**Error Cases:**
- Invalid hash → throw `Error: Commit '${hash}' not found`

---

## PR-003: Create Integration Branch

```typescript
async function createIntegrationBranch(commits: string[]): Promise<void>
// creates integration branch with cherry-picked commits
```

**Acceptance Criteria:**
- [ ] Creates new branch from staging
- [ ] Cherry-picks selected commits in order
- [ ] Handles cherry-pick conflicts

**Error Cases:**
- Cherry-pick conflict → report conflict, don't continue

---

## PR-004: Open PR to Upstream (Fork)

```typescript
interface PROptions {
  title?: string
  body?: string
  base?: string // upstream branch
}

async function openUpstreamPR(branch: string, options?: PROptions): Promise<PRResult>
interface PRResult {
  url: string
  number: number
}
```

**Acceptance Criteria:**
- [ ] Opens PR to upstream remote
- [ ] Uses `gh pr create` or `glab mr create`
- [ ] Returns PR URL and number

**Error Cases:**
- Not a fork → throw `Error: Not a fork. Use internal PR instead.`
- No upstream remote → throw `Error: No upstream remote configured`

---

## PR-005: Open Internal PR

```typescript
async function openInternalPR(branch: string, options?: PROptions): Promise<PRResult>
```

**Acceptance Criteria:**
- [ ] Opens PR within same repo
- [ ] Targets default branch or specified base

---

## PR-006: Show Diff Before PR

```typescript
async function showDiff(branch: string, baseBranch: string): Promise<string>
// returns diff as string
```

**Acceptance Criteria:**
- [ ] Shows all changes that would be in PR
- [ ] Colorizes output if terminal supports it

---

## PR-007: Support PR Templates

```typescript
interface PRTemplate {
  title?: string
  body?: string
  labels?: string[]
}

async function applyPRTemplate(template: PRTemplate): Promise<void>
```

**Acceptance Criteria:**
- [ ] Uses template for PR title/body
- [ ] Adds labels if specified

---

*See [COMMITS.md](COMMITS.md) for commit tracking.*
