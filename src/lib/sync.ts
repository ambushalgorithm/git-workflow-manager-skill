import { git, getCurrentBranch, getBranches, branchExists, pushBranch, fetchAll } from './git';
import type { WorkflowConfig } from '../types';

/**
 * Sync staging branch - rebase onto master
 */
export async function syncStaging(config: WorkflowConfig, force = false): Promise<void> {
  const defaultBranch = config.defaultBranch || 'master';
  
  // Fetch latest
  await fetchAll();
  
  // Checkout staging
  const currentBranch = await getCurrentBranch();
  if (currentBranch !== 'staging') {
    await git(['checkout', 'staging']);
  }
  
  // Pull latest staging first (in case it was updated via GitHub)
  console.log('Pulling latest staging...');
  try {
    await git(['pull', 'origin', 'staging']);
  } catch {
    // May fail if no tracking, continue anyway
  }
  
  // Rebase onto master
  console.log(`Rebasing staging onto ${defaultBranch}...`);
  try {
    await git(['rebase', defaultBranch]);
  } catch (error) {
    console.error('Rebase conflict detected. Resolve conflicts and run: git-workflow rebase --continue');
    throw error;
  }
  
  // Push
  await pushBranch('staging');
  console.log(`Staging synced with ${defaultBranch}`);
}

/**
 * Sync develop branch - rebase onto staging
 */
export async function syncDevelop(config: WorkflowConfig, force = false): Promise<void> {
  // Fetch latest
  await fetchAll();
  
  // Checkout develop
  const currentBranch = await getCurrentBranch();
  if (currentBranch !== 'develop') {
    await git(['checkout', 'develop']);
  }
  
  // Pull latest staging first (in case it was updated via GitHub)
  console.log('Pulling latest staging...');
  try {
    await git(['pull', 'origin', 'staging']);
  } catch {
    // May fail if no tracking, continue anyway
  }
  
  // Rebase onto staging
  console.log('Rebasing develop onto staging...');
  try {
    await git(['rebase', 'staging']);
  } catch (error) {
    console.error('Rebase conflict detected. Resolve conflicts and run: git-workflow rebase --continue');
    throw error;
  }
  
  // Push
  await pushBranch('develop');
  console.log('Develop synced with staging');
}

/**
 * Sync all branches in hierarchy order
 */
export async function syncAll(config: WorkflowConfig, force = false): Promise<void> {
  const defaultBranch = config.defaultBranch || 'master';
  
  console.log('=== Syncing All Branches ===');
  
  // First sync staging onto master
  console.log(`\n[1/2] Syncing staging...`);
  await syncStaging(config, force);
  
  // Then sync develop onto staging
  console.log(`\n[2/2] Syncing develop...`);
  await syncDevelop(config, force);
  
  console.log('\n=== All branches synced ===');
}

/**
 * Abort an in-progress rebase
 */
export async function abortRebase(): Promise<void> {
  await git(['rebase', '--abort']);
}

/**
 * Continue after resolving rebase conflicts
 */
export async function continueRebase(): Promise<void> {
  await git(['rebase', '--continue']);
}

/**
 * Check if currently in rebasing state
 */
export async function isInRebase(): Promise<boolean> {
  const { execSync } = await import('child_process');
  try {
    const stdout = execSync('git status --porcelain', { encoding: 'utf8' });
    return stdout.includes('rebase in progress');
  } catch {
    return false;
  }
}
