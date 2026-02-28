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
    await git(['pull', '--rebase', 'origin', 'staging']);
  } catch {
    // May fail if no tracking, continue anyway
  }
  
  // Check if staging needs to be rebased onto main
  // Count commits between staging and origin/main
  const revList = await git(['rev-list', '--count', 'staging..origin/main']);
  const commitsBehind = parseInt(revList.trim(), 10) || 0;
  
  if (commitsBehind === 0) {
    console.log('Staging is already up to date with main. Nothing to sync.');
    return;
  }
  
  console.log(`Staging is ${commitsBehind} commit(s) behind main. Rebasing...`);
  
  // Rebase onto origin/main
  try {
    await git(['rebase', `origin/${defaultBranch}`]);
  } catch (error) {
    console.error('Rebase conflict detected. Resolve conflicts and run: git-workflow rebase --continue');
    throw error;
  }
  
  // Push (force push needed after rebase)
  console.log('Pushing to origin (force push)...');
  await git(['push', '-f', 'origin', 'staging']);
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
    await git(['pull', '--rebase', 'origin', 'staging']);
  } catch {
    // May fail if no tracking, continue anyway
  }
  
  // Check if develop needs to be rebased onto staging
  const revList = await git(['rev-list', '--count', 'develop..origin/staging']);
  const commitsBehind = parseInt(revList.trim(), 10) || 0;
  
  if (commitsBehind === 0) {
    console.log('Develop is already up to date with staging. Nothing to sync.');
    return;
  }
  
  console.log(`Develop is ${commitsBehind} commit(s) behind staging. Rebasing...`);
  
  // Rebase onto origin/staging
  try {
    await git(['rebase', 'origin/staging']);
  } catch (error) {
    console.error('Rebase conflict detected. Resolve conflicts and run: git-workflow rebase --continue');
    throw error;
  }
  
  // Push (force push needed after rebase)
  console.log('Pushing to origin (force push)...');
  await git(['push', '-f', 'origin', 'develop']);
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
