# REPO - Repository Detection & Initialization

> Detailed requirements for repo detection and initialization. See [INDEX.md](INDEX.md).

---

## REPO-001: Detect Repo Type

```typescript
function detectRepoType(): Promise<RepoType>
type RepoType = 'fork' | 'internal'
```

**Acceptance Criteria:**
- [ ] Returns `'fork'` if `upstream` remote exists
- [ ] Returns `'internal'` if no `upstream` remote
- [ ] Works in any directory of the repo

**Error Cases:**
- Not in a git repo → throw `Error: Not a git repository`
- No remotes configured → return `'internal'`

---

## REPO-002: Prompt User Confirmation

```typescript
async function confirmRepoType(detected: RepoType): Promise<RepoType>
```

**Acceptance Criteria:**
- [ ] Shows detected type to user
- [ ] Allows override with `--type` flag
- [ ] Returns confirmed or overridden type

**Error Cases:**
- Invalid type provided → throw `Error: Invalid type. Use 'fork' or 'internal'`

---

## REPO-003: Create Branch Hierarchy

```typescript
async function createBranchHierarchy(type: RepoType): Promise<void>
```

**Acceptance Criteria:**
- [ ] Fork: creates `staging`, `integration`, `develop` from `master`
- [ ] Internal: creates `staging`, `integration`, `develop` from `master`
- [ ] Each branch has unique first commit (empty commit)
- [ ] All branches pushed to origin

**Error Cases:**
- Branch already exists → skip, don't fail
- No master branch → throw `Error: master branch required`

---

## REPO-004: Push Branches to Origin

```typescript
async function pushBranches(branches: string[]): Promise<void>
```

**Acceptance Criteria:**
- [ ] Pushes all specified branches
- [ ] Uses `--set-upstream` to track branches

**Error Cases:**
- Push rejected → throw `Error: Push failed. Check permissions.`

---

## REPO-005: Set Default Branch

```typescript
async function setDefaultBranch(branch: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] Sets specified branch as default on origin

**Error Cases:**
- Branch doesn't exist → throw `Error: Branch '${branch}' does not exist`

---

## REPO-006: Store Config

```typescript
async function storeConfig(config: WorkflowConfig): Promise<void>
```

**Acceptance Criteria:**
- [ ] Writes to `.git/workflow.json`
- [ ] Creates file if not exists
- [ ] Validates config schema

**Error Cases:**
- Invalid config → throw `Error: Invalid config schema`
- Write permission denied → throw `Error: Cannot write config`

---

## REPO-007: Support CLI Flags

```typescript
interface InitOptions {
  type?: 'fork' | 'internal'
  force?: boolean
  push?: boolean
}
```

**Acceptance Criteria:**
- [ ] `--type fork` forces fork mode
- [ ] `--type internal` forces internal mode
- [ ] `--force` overwrites existing config
- [ ] `--push` pushes branches after creation

---

*See [BRANCHES.md](BRANCHES.md) for branch management requirements.*
