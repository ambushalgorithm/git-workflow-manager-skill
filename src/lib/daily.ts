import { git } from './git';
import { loadConfig } from './repo';
import type { WorkflowConfig } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

// Types
export interface PRInfo {
  number: number
  title: string
  state: 'open' | 'merged' | 'closed'
  headBranch: string
  baseBranch: string
  url: string
  mergeable: boolean
  checksPassing: boolean
}

export interface PRDetail extends PRInfo {
  author: string
  createdAt: string
  updatedAt: string
  reviewers: string[]
  labels: string[]
  isDraft: boolean
}

export interface UpstreamStatus {
  newCommits: number
  mergedPRs: PRInfo[]
  newPRs: PRInfo[]
}

export interface Blockers {
  conflicts: string[]
  failedChecks: string[]
  staleBranches: string[]
}

export interface BranchAttention {
  branch: string
  reason: string
  action: string
}

export interface BranchInfo {
  branch: string
  ahead: number
  behind: number
  lastCommit: string
}

export interface DailyReport {
  repo: string
  type: 'fork' | 'internal'
  date: string
  branchStatus: BranchInfo[]
  prStatus: PRInfo[]
  blockers: Blockers
  attention: BranchAttention[]
}

export interface ReportChannel {
  type: 'discord' | 'slack' | 'email' | 'webhook'
  target: string
}

/**
 * Run a command directly (not through git wrapper)
 */
async function runCmd(cmd: string, cwd?: string): Promise<string> {
  const { stdout } = await promisify(exec)(cmd, { cwd });
  return stdout.trim();
}

// Common gh installation paths
const GH_PATHS = [
  'gh',
  '/home/linuxbrew/.linuxbrew/bin/gh',
  '/usr/local/bin/gh',
  '/opt/homebrew/bin/gh',
];

/**
 * Detect if gh CLI is available
 */
export async function detectGitCLI(): Promise<boolean> {
  for (const ghPath of GH_PATHS) {
    try {
      await runCmd(`${ghPath} --version`);
      return true;
    } catch {
      // Try next path
    }
  }
  return false;
}

/**
 * Run gh command with arguments
 */
async function ghCommand(args: string[], cwd?: string): Promise<string> {
  for (const ghPath of GH_PATHS) {
    try {
      return await runCmd(`${ghPath} ${args.join(' ')}`, cwd);
    } catch {
      // Try next path
    }
  }
  throw new Error('GitHub CLI (gh) not found. Install it to use PR features.');
}

/**
 * List open PRs using gh CLI
 */
export interface ListPROptions {
  author?: string;
  assignee?: string;
  base?: string;
  label?: string;
  state?: 'open' | 'closed' | 'merged' | 'all';
  limit?: number;
  baseBranch?: string; // For branch comparison (default: develop)
}

export async function listOpenPRs(options: ListPROptions = {}): Promise<PRInfo[]> {
  if (!(await detectGitCLI())) {
    throw new Error('GitHub CLI (gh) not found. Install it to use PR features.');
  }

  const args = ['pr', 'list', '--json', 'number,title,state,headRefName,baseRefName,url,mergeable,statusCheckRollup'];

  if (options.author) args.push('--author', options.author);
  if (options.assignee) args.push('--assignee', options.assignee);
  if (options.base) args.push('--base', options.base);
  if (options.label) args.push('--label', options.label);
  if (options.state && options.state !== 'open') args.push('--state', options.state);
  if (options.limit && options.limit !== 30) args.push('--limit', options.limit.toString());

  try {
    const output = await ghCommand(args);
    const prs = JSON.parse(output);

    return prs.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state.toLowerCase() as 'open' | 'merged' | 'closed',
      headBranch: pr.headRefName,
      baseBranch: pr.baseRefName,
      url: pr.url,
      mergeable: pr.mergeable !== false,
      checksPassing: !pr.statusCheckRollup?.length || pr.statusCheckRollup.some((c: any) => c.state === 'SUCCESS'),
    }));
  } catch (error: any) {
    // If not in a GitHub repo, return empty
    if (error.message.includes('could not resolve')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get detailed PR info
 */
export async function getPRDetails(prNumber: number): Promise<PRDetail | null> {
  if (!(await detectGitCLI())) {
    return null;
  }

  try {
    const output = await ghCommand(['pr', 'view', prNumber.toString(), '--json', 'number,title,state,headRefName,baseRefName,url,mergeable,author,createdAt,updatedAt,reviewers,labels,isDraft']);
    const pr = JSON.parse(output);

    return {
      number: pr.number,
      title: pr.title,
      state: pr.state as 'open' | 'merged' | 'closed',
      headBranch: pr.headRefName,
      baseBranch: pr.baseRefName,
      url: pr.url,
      mergeable: pr.mergeable !== false,
      checksPassing: true,
      author: pr.author?.login || '',
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      reviewers: pr.reviewers?.map((r: any) => r.login) || [],
      labels: pr.labels?.map((l: any) => l.name) || [],
      isDraft: pr.isDraft || false,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a PR is merged
 */
export async function checkPRMerged(prNumber: number): Promise<boolean> {
  if (!(await detectGitCLI())) {
    return false;
  }

  try {
    const output = await ghCommand(['pr', 'view', prNumber.toString(), '--json', 'state']);
    const pr = JSON.parse(output);
    return pr.state === 'MERGED';
  } catch {
    return false;
  }
}

/**
 * Detect new upstream commits
 */
export async function detectNewUpstreamCommits(): Promise<number> {
  const config = await loadConfig();
  if (!config?.upstreamRemote) {
    return 0;
  }

  try {
    // Get local default branch count
    const localCount = await git(['rev-list', '--count', config.defaultBranch]);
    // Get upstream default branch count
    const upstreamCount = await git(['rev-list', '--count', `${config.upstreamRemote}/${config.defaultBranch}`]);

    const local = parseInt(localCount.trim(), 10) || 0;
    const upstream = parseInt(upstreamCount.trim(), 10) || 0;

    return Math.max(0, upstream - local);
  } catch {
    return 0;
  }
}

/**
 * Check upstream PR status (for forks)
 */
export async function checkUpstreamStatus(): Promise<UpstreamStatus> {
  const config = await loadConfig();
  const status: UpstreamStatus = {
    newCommits: 0,
    mergedPRs: [],
    newPRs: [],
  };

  // Check for new commits
  status.newCommits = await detectNewUpstreamCommits();

  if (!(await detectGitCLI()) || !config?.upstreamRemote) {
    return status;
  }

  try {
    // List upstream PRs
    const allPRs = await listOpenPRs();
    status.mergedPRs = allPRs.filter(pr => pr.state === 'merged');
    status.newPRs = allPRs.filter(pr => pr.state === 'open');
  } catch {
    // Ignore errors, return what we have
  }

  return status;
}

/**
 * Get local branches with their status
 * @param baseBranch Branch to compare against (default: develop)
 */
export async function getBranchStatus(baseBranch: string = 'develop'): Promise<BranchInfo[]> {
  const branches: BranchInfo[] = [];

  try {
    const output = await git(['for-each-ref', '--format=%(refname:short) %(creatordate:iso) %(upstream:short)', 'refs/heads/']);
    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const [branch, date] = line.split(' ');
      // Skip protected branches and PR branches (*-pr), feature/* branches
      if (!branch || 
          branch === 'main' || 
          branch === 'master' || 
          branch === 'develop' || 
          branch === 'staging' || 
          branch === 'integration' ||
          branch.startsWith('staging-') ||
          branch.startsWith('integration-') ||
          branch.endsWith('-pr')) {
        continue;
      }

      // Check ahead/behind against base branch (not upstream)
      let ahead = 0, behind = 0;
      try {
        const revInfo = await git(['rev-list', '--left-right', '--count', `${branch}...origin/${baseBranch}`]);
        const [a, b] = revInfo.trim().split(/\s+/);
        ahead = parseInt(a, 10) || 0;
        behind = parseInt(b, 10) || 0;
      } catch {
        // Branch may not be comparable
      }

      branches.push({
        branch,
        ahead,
        behind,
        lastCommit: date || '',
      });
    }
  } catch {
    // Ignore
  }

  return branches;
}

/**
 * Detect branches with conflicts
 */
async function detectConflictBranches(): Promise<string[]> {
  const conflicting: string[] = [];

  try {
    const output = await git(['branch', '-a', '--format', '%(refname:short)']);
    const branches = output.trim().split('\n').filter(Boolean);

    for (const branch of branches) {
      if (branch.includes('->')) continue;

      try {
        const current = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
        if (current.trim() === branch) continue;

        // Try to rebase onto itself to check for conflicts
        await git(['merge-tree', `origin/${branch}`, branch, branch]);
      } catch {
        // If it fails, there might be conflicts
        // This is a simplification - real detection would need more complex logic
      }
    }
  } catch {
    // Ignore
  }

  return conflicting;
}

/**
 * Detect stale branches (not updated in N days)
 */
async function detectStaleBranches(days: number = 30): Promise<string[]> {
  const stale: string[] = [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  try {
    const branches = (await git(['branch', '--format', '%(refname:short)']))
      .trim()
      .split('\n')
      .filter(Boolean);

    for (const branch of branches) {
      if (!branch || branch === 'main' || branch === 'master') continue;

      try {
        const dateOutput = await git(['log', '-1', '--format=%ci', branch]);
        const commitDate = new Date(dateOutput.trim());

        if (commitDate < cutoff) {
          stale.push(branch);
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // Ignore
  }

  return stale;
}

/**
 * Report blockers
 */
export async function reportBlockers(options: ListPROptions = {}): Promise<Blockers> {
  const blockers: Blockers = {
    conflicts: [],
    failedChecks: [],
    staleBranches: [],
  };

  // Get stale branches
  blockers.staleBranches = await detectStaleBranches();

  // Get PRs with failed checks (apply filters)
  try {
    if (await detectGitCLI()) {
      const prs = await listOpenPRs(options);
      blockers.failedChecks = prs
        .filter(pr => !pr.checksPassing)
        .map(pr => `PR #${pr.number}: ${pr.title}`);
    }
  } catch {
    // Ignore
  }

  return blockers;
}

/**
 * Show branches needing attention
 * @param baseBranch Branch to compare against (default: develop)
 */
export async function showBranchesNeedingAttention(baseBranch: string = 'develop'): Promise<BranchAttention[]> {
  const attention: BranchAttention[] = [];
  
  const branches = await getBranchStatus(baseBranch);

  for (const branch of branches) {
    if (branch.behind > 0) {
      attention.push({
        branch: branch.branch,
        reason: `${branch.behind} commits behind ${baseBranch}`,
        action: `git-workflow rebase ${baseBranch}`,
      });
    }
    if (branch.ahead > 0) {
      attention.push({
        branch: branch.branch,
        reason: `${branch.ahead} commits ahead of remote`,
        action: `git push`,
      });
    }
  }

  return attention;
}

/**
 * Generate daily report
 */
export async function generateDailyReport(options: ListPROptions = {}): Promise<DailyReport> {
  const config = await loadConfig() || {} as WorkflowConfig;

  const report: DailyReport = {
    repo: '',
    type: config.repoType || 'internal',
    date: new Date().toISOString().split('T')[0],
    branchStatus: [],
    prStatus: [],
    blockers: { conflicts: [], failedChecks: [], staleBranches: [] },
    attention: [],
  };

  // Get repo name from git
  try {
    const remoteUrl = await git(['remote', 'get-url', 'origin']);
    const match = remoteUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    report.repo = match ? match[1] : 'unknown';
  } catch {
    report.repo = 'unknown';
  }

  // Get branch status
  const baseBranch = options.baseBranch || 'develop';
  report.branchStatus = await getBranchStatus(baseBranch);

  // Get PR status
  try {
    report.prStatus = await listOpenPRs(options);
  } catch {
    report.prStatus = [];
  }

  // Get blockers
  report.blockers = await reportBlockers(options);

  // Get branches needing attention
  report.attention = await showBranchesNeedingAttention(baseBranch);

  return report;
}

/**
 * Run daily check (main entry point)
 */
export async function runDailyCheck(options: ListPROptions = {}): Promise<DailyReport> {
  return generateDailyReport(options);
}

/**
 * Format report for display
 */
export function formatDailyReport(report: DailyReport): string {
  let output = `# Daily Report - ${report.repo}\n`;
  output += `Date: ${report.date}\n`;
  output += `Type: ${report.type}\n\n`;

  // PR Status
  output += `## Pull Requests (${report.prStatus.length})\n`;
  if (report.prStatus.length === 0) {
    output += `- No open PRs\n`;
  } else {
    for (const pr of report.prStatus) {
      output += `- #${pr.number}: ${pr.title} (${pr.state}) [${pr.baseBranch}]\n`;
    }
  }
  output += '\n';

  // Blockers
  output += `## Blockers\n`;
  if (report.blockers.staleBranches.length > 0) {
    output += `- Stale branches: ${report.blockers.staleBranches.join(', ')}\n`;
  }
  if (report.blockers.failedChecks.length > 0) {
    output += `- Failed checks:\n`;
    for (const check of report.blockers.failedChecks) {
      output += `  - ${check}\n`;
    }
  }
  if (report.blockers.staleBranches.length === 0 && report.blockers.failedChecks.length === 0) {
    output += `- No blockers\n`;
  }
  output += '\n';

  // Branches needing attention
  output += `## Branches Needing Attention (${report.attention.length})\n`;
  if (report.attention.length === 0) {
    output += `- All branches up to date\n`;
  } else {
    for (const item of report.attention) {
      output += `- ${item.branch}: ${item.reason}\n`;
      output += `  → ${item.action}\n`;
    }
  }

  return output;
}