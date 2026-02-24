# BRANCHES - Branch Management

> Detailed requirements for branch management. See [INDEX.md](INDEX.md).

---

## BRANCH-001: List Branches

```typescript
interface BranchInfo {
  name: string
  isRemote: boolean
  parentBranch?: string
  lastCommit?: string
  lastCommitDate?: Date
}

async function listBranches(): Promise<BranchInfo[]>
```

**Acceptance Criteria:**
- [ ] Returns all local and remote branches
- [ ] Includes branch name and remote status
- [ ] Shows parent branch for workflow branches

**Error Cases:**
- Git error → throw with git error message

---

## BRANCH-002: Create Feature Branch

```typescript
async function createFeatureBranch(name: string, parentBranch?: string): Promise<void>
// parentBranch defaults to 'develop'
```

**Acceptance Criteria:**
- [ ] Creates branch off `develop` (or specified parent)
- [ ] Switches to new branch after creation
- [ ] Follows naming convention: `feat/` prefix

**Error Cases:**
- Branch name invalid → throw `Error: Invalid branch name`
- Parent doesn't exist → throw `Error: Parent branch '${parent}' does not exist`

---

## BRANCH-003: Create Hotfix Branch

```typescript
async function createHotfixBranch(name: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] Creates branch off `staging`
- [ ] Follows naming convention: `hotfix/` prefix

**Error Cases:**
- Staging branch doesn't exist → throw `Error: staging branch required for hotfix`

---

## BRANCH-004: Create Release Branch

```typescript
async function createReleaseBranch(version: string): Promise<void>
```

**Acceptance Criteria:**
- [ ] Creates branch off `staging`
- [ ] Follows naming convention: `release/x.x.x`

**Error Cases:**
- Invalid version format → throw `Error: Invalid version format`

---

## BRANCH-005: Delete Branch

```typescript
async function deleteBranch(name: string, force?: boolean): Promise<void>
```

**Acceptance Criteria:**
- [ ] Deletes local branch
- [ ] Deletes remote branch if `--delete-remote` flag
- [ ] `--force` bypasses unmerged check

**Error Cases:**
- Branch is default → throw `Error: Cannot delete default branch`
- Branch not fully merged → throw unless `--force`

---

## BRANCH-006: Track Parent Branch

```typescript
interface BranchRelationship {
  branch: string
  parent: string
  type: 'feature' | 'hotfix' | 'release' | 'integration' | 'develop' | 'staging'
}

async function getBranchParent(branch: string): Promise<BranchRelationship>
```

**Acceptance Criteria:**
- [ ] Returns parent branch name
- [ ] Returns branch type (feature/hotfix/release/etc)

---

*See [SYNC.md](SYNC.md) for sync operations.*
