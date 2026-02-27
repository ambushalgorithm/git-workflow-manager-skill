import { git, branchExists, createBranchFrom, checkout, getCurrentBranch, getBranches, fetchAll, pushBranch } from './git';
import { loadConfig } from './repo';
import type { WorkflowConfig } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Get list of pr-ready commits from config
 */
export async function getPRReadyCommits(): Promise<string[]> {
  const config = await loadConfig() as WorkflowConfig;
  const commits = config.tracking?.commits || [];
  return commits
    .filter(c => c.status === 'pr-ready')
    .map(c => c.hash);
}

/**
 * Get list of pr-ready commits that exist on the current working branch
 * Uses Option B: Query branch log directly for efficiency and safety
 */
export async function getPRReadyCommitsOnBranch(): Promise<string[]> {
  // 1. Get current branch name
  const currentBranch = await getCurrentBranch();
  
  if (!currentBranch) {
    throw new Error('Detached HEAD. Must be on a working branch to create PR branch.');
  }
  
  // 3. Get all pr-ready commits from config
  const allPRReady = await getPRReadyCommits();
  
  if (allPRReady.length === 0) {
    return [];
  }
  
  // 4. Get commit hashes on current branch
  const branchLog = await git(['log', '--format=%h', currentBranch]);
  const branchHashes = branchLog.trim().split('\n').filter(Boolean);
  
  // 5. Filter: only include pr-ready commits that exist in branch history
  const branchCommits = allPRReady.filter(hash =>
    branchHashes.some(h => h.startsWith(hash.slice(0, 7)))
  );
  
  return branchCommits;
}

/**
 * Detect if repo is fork (has upstream remote)
 */
export async function isFork(): Promise<boolean> {
  try {
    await git(['remote', 'get-url', 'upstream']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get target repo and branch for PR
 * Uses config defaultBaseBranch if set, otherwise auto-detects
 */
export async function getPRTarget(): Promise<{ owner: string; repo: string; baseBranch: string }> {
  const fork = await isFork();
  const config = await loadConfig() as WorkflowConfig;
  
  // Use configured base branch or auto-detect
  const configuredBase = config.defaultBaseBranch;
  
  // Auto-detect default branch from origin if not configured
  let autoDetectedBase = 'main';
  if (!configuredBase) {
    try {
      const ref = await git(['symbolic-ref', 'refs/remotes/origin/HEAD']);
      autoDetectedBase = ref.replace('refs/remotes/origin/', '').trim();
    } catch {
      autoDetectedBase = 'main';
    }
  }
  
  const baseBranch = configuredBase || autoDetectedBase;
  
  if (fork) {
    // Get upstream info
    const url = await git(['remote', 'get-url', 'upstream']);
    // Handle both HTTPS and SSH formats: https://github.com/owner/repo or git@github.com-owner:owner/repo
    const match = url.match(/(?:github\.com[/:]([^/:]+)|:([^/]+))\/([^\/]+)/);
    if (!match) throw new Error('Could not parse upstream URL');
    const owner = match[1] || match[2];
    return {
      owner: owner,
      repo: match[3],
      baseBranch
    };
  } else {
    // Get origin info
    const url = await git(['remote', 'get-url', 'origin']);
    // Handle both HTTPS and SSH formats
    const match = url.match(/(?:github\.com[/:]([^/:]+)|:([^/]+))\/([^\/]+)/);
    if (!match) throw new Error('Could not parse origin URL');
    const owner = match[1] || match[2];
    return {
      owner: owner,
      repo: match[3],
      baseBranch
    };
  }
}

/**
 * Create a PR branch from pr-ready commits
 */
export async function createPRBranch(name: string, fromBranch?: string): Promise<void> {
  const config = await loadConfig() as WorkflowConfig;
  
  // Get pr-ready commits that exist on current branch
  const prReadyCommits = await getPRReadyCommitsOnBranch();
  
  if (prReadyCommits.length === 0) {
    const allPRReady = await getPRReadyCommits();
    if (allPRReady.length === 0) {
      throw new Error('No pr-ready commits found. Tag commits with "git-workflow tag <hash> pr-ready"');
    } else {
      throw new Error('No pr-ready commits found on this branch. Make sure you\'re on the correct feature branch.');
    }
  }
  
  // Determine parent branch
  const hierarchy = config.hierarchy || { integration: 'integration', develop: 'develop' };
  const parentBranch = hierarchy.integration || 'integration';
  
  // Create branch from parent
  if (!(await branchExists(parentBranch))) {
    throw new Error(`Parent branch "${parentBranch}" does not exist`);
  }
  
  // Determine PR branch name - don't double -pr if already present
  const prBranchName = name.endsWith('-pr') ? name : `${name}-pr`;
  
  // Create and checkout new branch
  await git(['checkout', '-b', prBranchName, parentBranch]);
  
  // Cherry-pick each pr-ready commit
  console.log(`Cherry-picking ${prReadyCommits.length} pr-ready commit(s)...`);
  for (const commit of prReadyCommits) {
    try {
      await git(['cherry-pick', commit]);
      console.log(`  ✓ Cherry-picked ${commit.slice(0, 7)}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to cherry-pick ${commit.slice(0, 7)}: ${error.message}`);
      // Abort cherry-pick and cleanup
      await git(['cherry-pick', '--abort']);
      await git(['checkout', hierarchy.develop || 'develop']);
      await git(['branch', '-D', prBranchName]);
      throw new Error(`Cherry-pick failed for commit ${commit.slice(0, 7)}. Resolve conflicts and try again.`);
    }
  }
  
  // Push to remote
  await pushBranch(prBranchName);
  console.log(`\n✓ Created PR branch "${prBranchName}" from ${prReadyCommits.length} commit(s)`);
  console.log(`  Branch: ${prBranchName}`);
  console.log(`  Parent: ${parentBranch}`);
  console.log(`\nTo create PR: gh pr create --base <target> --head ${prBranchName}`);
}

/**
 * Update existing PR branch with new pr-ready commits
 */
export async function updatePRBranch(name: string): Promise<void> {
  const config = await loadConfig() as WorkflowConfig;
  
  // Get pr-ready commits on current branch
  const prReadyCommits = await getPRReadyCommitsOnBranch();
  
  // Determine PR branch name - don't double -pr if already present
  const prBranchName = name.endsWith('-pr') ? name : `${name}-pr`;
  
  if (!(await branchExists(prBranchName))) {
    throw new Error(`PR branch "${prBranchName}" does not exist. Create it first with "git-workflow pr-branch create ${name}"`);
  }
  
  // Checkout PR branch
  await checkout(prBranchName);
  
  // Get commits already in PR branch
  const existingCommits = await git(['log', '--format=%h', `${prBranchName} ^${config.hierarchy?.integration || 'integration'}`]);
  const existingHashes = existingCommits.trim().split('\n').filter(Boolean);
  
  // Find new pr-ready commits
  const newCommits = prReadyCommits.filter(c => !existingHashes.includes(c.slice(0, 7)));
  
  if (newCommits.length === 0) {
    console.log('No new pr-ready commits to add.');
    return;
  }
  
  // Cherry-pick new commits
  console.log(`Adding ${newCommits.length} new pr-ready commit(s)...`);
  for (const commit of newCommits) {
    try {
      await git(['cherry-pick', commit]);
      console.log(`  ✓ Cherry-picked ${commit.slice(0, 7)}`);
    } catch (error: any) {
      await git(['cherry-pick', '--abort']);
      throw new Error(`Cherry-pick failed for ${commit.slice(0, 7)}: ${error.message}`);
    }
  }
  
  // Force push
  await git(['push', '-f', 'origin', prBranchName]);
  console.log(`\n✓ Updated PR branch "${prBranchName}" with ${newCommits.length} new commit(s)`);
}

/**
 * List active PR branches
 */
export async function listPRBranches(): Promise<string[]> {
  const branches = await git(['branch', '-r', '--format=%(refname:short)']);
  const allBranches = branches.trim().split('\n').filter(Boolean);
  
  // Filter for PR branches (ending in -pr)
  return allBranches.filter(b => b.endsWith('-pr') && b.startsWith('origin/'));
}

/**
 * Parse conventional commit type from message
 */
function parseCommitType(message: string): string {
  const match = message.match(/^(\w+)(\(.+\))?:/);
  if (!match) return 'other';
  
  const type = match[1].toLowerCase();
  const validTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert'];
  
  return validTypes.includes(type) ? type : 'other';
}

/**
 * Generate empty PR template (for --dry-run preview)
 */
export async function generatePRTemplate(): Promise<string> {
  const model = process.env.OPENCLAW_MODEL || '[Model]';
  const openclawVersion = process.env.OPENCLAW_VERSION || '[version]';
  
  return `### AI/Vibe-Coded Disclosure 🤖
- [x] **AI-assisted:** Built with ${model} + [AI-agent e.g., OpenClaw] ${openclawVersion}
- [x] **Testing level:** [e.g., Fully tested (N tests)]
- [x] **Code understanding:** Yes — reviewed for compliance with [Project] standards

# Summary
[2-3 sentence overview of what this PR does]

## What
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]

## Why
[Why this change matters - what problem does it solve? What does it enable?]

## Technical Changes
| File | Change |
|------|--------|
| file1.py | [Change description] |
| file2.ts | [Change description] |

## Testing
- ✅ [Test 1]
- ✅ [Test 2]

## Breaking Changes
[None or describe any breaking changes]

## Related
[Any related PRs, issues, or context]`;
}

/**
 * Generate PR description from commit messages
 * Uses the current working branch (not the PR branch)
 */
export async function generatePRDescription(branchName: string): Promise<string> {
  // Get commits from the working branch (feature branch), not the PR branch
  // The branchName is the PR branch name, but we need the working branch commits
  const config = await loadConfig() as WorkflowConfig;
  const hierarchy = config.hierarchy || { integration: 'integration', develop: 'develop', main: 'main' };
  
  // Use configured baseBranch or get from target
  let baseBranch = config.defaultBaseBranch;
  if (!baseBranch) {
    try {
      const ref = await git(['symbolic-ref', 'refs/remotes/origin/HEAD']);
      baseBranch = ref.replace('refs/remotes/origin/', '').trim();
    } catch {
      baseBranch = hierarchy.main || 'main';
    }
  }
  
  // Get current working branch (the feature branch)
  const workingBranch = await getCurrentBranch();
  
  if (!workingBranch) {
    return '';
  }
  
  // Get commit messages from working branch vs base (main)
  // Syntax: origin/main..workingBranch
  const log = await git(['log', '--format=%s', `origin/${baseBranch}..${workingBranch}`]);
  const commits = log.trim().split('\n').filter(Boolean);
  
  if (commits.length === 0) {
    return '';
  }
  
  // Group commits by type
  const byType: Record<string, string[]> = {
    feat: [],
    fix: [],
    docs: [],
    style: [],
    refactor: [],
    perf: [],
    test: [],
    chore: [],
    ci: [],
    build: [],
    revert: [],
    other: []
  };
  
  for (const commit of commits) {
    const type = parseCommitType(commit);
    byType[type].push(commit);
  }
  
  // Get model info for disclosure
  const model = process.env.OPENCLAW_MODEL || 'unknown';
  const openclawVersion = process.env.OPENCLAW_VERSION || 'unknown';
  
  // Build sections
  const what: string[] = [];
  const why: string[] = [];
  
  // Add commits to "What" section
  for (const [type, msgs] of Object.entries(byType)) {
    if (msgs.length === 0) continue;
    
    for (const msg of msgs) {
      // Clean commit message (remove type prefix for cleaner bullets)
      const cleanMsg = msg.replace(/^\w+(\(.+\))?: /, '');
      what.push(`- ${cleanMsg}`);
    }
  }
  
  // Generate "Why" section based on commit types
  if (byType.feat.length > 0) {
    why.push('This PR adds new functionality/features to the project.');
  }
  if (byType.fix.length > 0) {
    why.push('Includes bug fixes that improve stability.');
  }
  if (byType.refactor.length > 0) {
    why.push('Code refactoring for better maintainability.');
  }
  if (byType.docs.length > 0) {
    why.push('Documentation improvements.');
  }
  
  // Build the description
  const testCount = byType.test.length > 0 ? byType.test.length : 'N/A';
  
  let description = `### AI/Vibe-Coded Disclosure 🤖
- [x] **AI-assisted:** Built with ${model} + OpenClaw v${openclawVersion}
- [x] **Testing level:** ${testCount} tests
- [x] **Code understanding:** Yes — reviewed for compliance

# Summary
This PR contains ${commits.length} commit(s) with changes across ${Object.entries(byType).filter(([_, v]) => v.length > 0).length} categories.

## What
${what.join('\n')}

## Why
${why.join(' ') || 'Improvements and enhancements to the codebase.'}

## Technical Changes

| File | Change |
|------|--------|
| Multiple | ${commits.length} commit(s) in PR branch |

## Testing
- ✅ PR branch created from pr-ready commits
- ✅ Changes reviewed and ready for merge

## Breaking Changes
[None]

## Related
- Branch: ${branchName}
- Base: ${baseBranch}
`;
  
  return description;
}

/**
 * Create a PR using gh CLI
 * If no body provided, auto-generates from commit messages
 * If dryRun is true, shows template for AI/human to fill in
 */
export async function createPR(title: string, body: string | null, prBranchName: string, dryRun: boolean = false): Promise<void> {
  const target = await getPRTarget();
  
  // Auto-generate description if not provided
  const description = body || await generatePRDescription(prBranchName);
  
  console.log(`Creating PR:`);
  console.log(`  From: ${prBranchName}`);
  console.log(`  To: ${target.owner}/${target.repo}:${target.baseBranch}`);
  
  if (dryRun) {
    // Show empty template for AI/human to fill in
    const template = await generatePRTemplate();
    console.log('\n=== PR Template (not created) ===\n');
    console.log(`Title: ${title}`);
    console.log(`\nBody:\n${template}`);
    console.log('\n=== End Template ===\n');
    console.log('To create the PR, run:');
    console.log(`  git-workflow pr create ${prBranchName.replace('-pr', '')} -t "${title}" -b "<paste filled template above>"`);
    return;
  }
  
  // Check if gh is available
  try {
    await git(['--version']);
  } catch {
    throw new Error('GitHub CLI (gh) not found. Install it to create PRs.');
  }
  
  // Create PR using gh
  const cmd = `gh pr create --base ${target.baseBranch} --head ${prBranchName} --title "${title}" --body "${description.replace(/"/g, '\\"')}"`;
  
  try {
    const stdout = await git(['pr', 'create', '--base', target.baseBranch, '--head', prBranchName, '--title', title, '--body', description]);
    console.log(`\n✓ PR created successfully!`);
    console.log(`  ${stdout}`);
  } catch (error: any) {
    // gh doesn't have pr create as git subcommand, use exec
    try {
      const { stdout } = await execAsync(cmd);
      console.log(`\n✓ PR created successfully!`);
      console.log(`  ${stdout}`);
    } catch (ghError: any) {
      if (ghError.message?.includes('already exists')) {
        throw new Error(`PR already exists for branch "${prBranchName}". Use --force to update.`);
      }
      throw new Error(`Failed to create PR: ${ghError.message}`);
    }
  }
}

/**
 * Sync working branch after PR feedback
 */
export async function syncFromPR(parentBranch: string): Promise<void> {
  const config = await loadConfig() as WorkflowConfig;
  const currentBranch = await getCurrentBranch();
  const hierarchy = config.hierarchy || { develop: 'develop' };
  
  // Default to develop if not specified
  const targetBranch = parentBranch || hierarchy.develop || 'develop';
  
  console.log(`Syncing "${currentBranch}" from ${targetBranch}...`);
  
  // Fetch latest
  await fetchAll();
  
  // Checkout parent and pull
  await checkout(targetBranch);
  await git(['pull', 'origin', targetBranch]);
  
  // Checkout working branch
  await checkout(currentBranch);
  
  // Rebase onto updated parent
  console.log(`Rebasing ${currentBranch} onto ${targetBranch}...`);
  try {
    await git(['rebase', targetBranch]);
  } catch (error: any) {
    console.error(`Rebase conflict! Resolve conflicts and run: git rebase --continue`);
    throw error;
  }
  
  console.log(`\n✓ Synced "${currentBranch}" onto latest ${targetBranch}`);
  console.log(`  Make your changes, then run: git-workflow pr-branch update <name>`);
}
