import { git, getCurrentBranch, fetchAll } from './git';

/**
 * Check if repository is a fork (has upstream remote)
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
 * Sync local master from upstream (fork only)
 */
export async function syncMaster(): Promise<void> {
  const fork = await isFork();
  
  if (!fork) {
    throw new Error('No upstream remote found. This command is only for forks.');
  }
  
  // Fetch from all remotes
  console.log('Fetching all remotes...');
  await fetchAll();
  
  // Checkout master
  const currentBranch = await getCurrentBranch();
  if (currentBranch !== 'master') {
    console.log('Checking out master...');
    await git(['checkout', 'master']);
  }
  
  // Pull from upstream/master
  console.log('Pulling from upstream/master...');
  try {
    await git(['pull', 'upstream', 'master']);
  } catch (error) {
    console.error('Pull failed. You may need to resolve conflicts manually.');
    throw error;
  }
  
  // Push to origin
  console.log('Pushing to origin/master...');
  await git(['push', 'origin', 'master']);
  
  console.log('Master synced with upstream.');
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
