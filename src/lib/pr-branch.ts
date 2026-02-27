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
 */
export async function getPRTarget(): Promise<{ owner: string; repo: string; baseBranch: string }> {
  const fork = await isFork();
  
  if (fork) {
    // Get upstream info
    const url = await git(['remote', 'get-url', 'upstream']);
    const match = url.match(/github\.com[/:]([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Could not parse upstream URL');
    return {
      owner: match[1],
      repo: match[2],
      baseBranch: 'main'
    };
  } else {
    // Get origin info
    const url = await git(['remote', 'get-url', 'origin']);
    const match = url.match(/github\.com[/:]([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Could not parse origin URL');
    return {
      owner: match[1],
      repo: match[2],
      baseBranch: 'staging'
    };
  }
}

/**
 * Create a PR branch from pr-ready commits
 */
export async function createPRBranch(name: string, fromBranch?: string): Promise<void> {
  const config = await loadConfig() as WorkflowConfig;
  const prReadyCommits = await getPRReadyCommits();
  
  if (prReadyCommits.length === 0) {
    throw new Error('No pr-ready commits found. Tag commits with "git-workflow tag <hash> pr-ready"');
  }
  
  // Determine parent branch
  const hierarchy = config.hierarchy || { integration: 'integration', develop: 'develop' };
  const parentBranch = hierarchy.integration || 'integration';
  
  // Create branch from parent
  if (!(await branchExists(parentBranch))) {
    throw new Error(`Parent branch "${parentBranch}" does not exist`);
  }
  
  const prBranchName = `${name}-pr`;
  
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
  const prReadyCommits = await getPRReadyCommits();
  
  const prBranchName = `${name}-pr`;
  
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
 * Create a PR using gh CLI
 */
export async function createPR(title: string, body: string, prBranchName: string): Promise<void> {
  const target = await getPRTarget();
  
  console.log(`Creating PR:`);
  console.log(`  From: ${prBranchName}`);
  console.log(`  To: ${target.owner}/${target.repo}:${target.baseBranch}`);
  
  // Check if gh is available
  try {
    await git(['--version']);
  } catch {
    throw new Error('GitHub CLI (gh) not found. Install it to create PRs.');
  }
  
  // Create PR using gh
  const cmd = `gh pr create --base ${target.baseBranch} --head ${prBranchName} --title "${title}" --body "${body}"`;
  
  try {
    const stdout = await git(['pr', 'create', '--base', target.baseBranch, '--head', prBranchName, '--title', title, '--body', body]);
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
