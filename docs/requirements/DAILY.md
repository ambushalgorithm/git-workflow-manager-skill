# DAILY - Daily Automation

> Detailed requirements for daily automation. See [INDEX.md](INDEX.md).

---

## DAILY-001: Run Daily Check

```typescript
async function runDailyCheck(): Promise<DailyReport>
```

**Acceptance Criteria:**
- [ ] Runs on schedule (called by cron)
- [ ] Checks all branches
- [ ] Checks all PRs
- [ ] Generates report

---

## DAILY-002: Check Upstream PR Status

```typescript
async function checkUpstreamStatus(): Promise<UpstreamStatus>
interface UpstreamStatus {
  newCommits: number
  mergedPRs: PRInfo[]
  newPRs: PRInfo[]
}
```

**Acceptance Criteria:**
- [ ] Detects new commits on upstream
- [ ] Lists new merged PRs
- [ ] Lists new open PRs

---

## DAILY-003: Detect New Upstream Commits

```typescript
async function detectNewUpstreamCommits(): Promise<number>
// returns count of new commits
```

**Acceptance Criteria:**
- [ ] Compares local master with upstream/master
- [ ] Returns count of commits difference

---

## DAILY-004: Report Blockers

```typescript
interface Blockers {
  conflicts: string[]
  failedChecks: string[]
  staleBranches: string[]
}
```

**Acceptance Criteria:**
- [ ] Lists branches with conflicts
- [ ] Lists PRs with failed checks
- [ ] Lists stale branches (not updated in N days)

---

## DAILY-005: Show Branches Needing Attention

```typescript
interface BranchAttention {
  branch: string
  reason: string
  action: string
}
```

**Acceptance Criteria:**
- [ ] Shows branches behind parent
- [ ] Shows branches with conflicts
- [ ] Suggests action to take

---

## DAILY-006: Generate Daily Report

```typescript
interface DailyReport {
  repo: string
  type: 'fork' | 'internal'
  date: string
  branchStatus: BranchInfo[]
  prStatus: PRInfo[]
  blockers: Blockers
  attention: BranchAttention[]
}

async function generateDailyReport(): Promise<DailyReport>
```

**Acceptance Criteria:**
- [ ] Matches format in REQUIREMENTS-CLI.md
- [ ] Includes all sections
- [ ] Timestamps report

---

## DAILY-007: Send Report to Channel

```typescript
interface ReportChannel {
  type: 'discord' | 'slack' | 'email' | 'webhook'
  target: string
}

async function sendReport(report: DailyReport, channel: ReportChannel): Promise<void>
```

**Acceptance Criteria:**
- [ ] Sends to configured channel
- [ ] Formats for channel (markdown for Discord, etc.)
- [ ] Handles delivery failures

---

*See [CONFIG.md](CONFIG.md) for configuration.*
