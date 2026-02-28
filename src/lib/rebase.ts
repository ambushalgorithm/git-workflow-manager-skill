import { git, getCurrentBranch, fetchAll, getBranches } from './git';
import type { WorkflowConfig } from '../types';

export type RebaseAction = 'rebase' | 'abort' | 'continue' | 'skip';

/**
 * Rebase a branch onto another branch
 */
export async function rebaseOnto(
  config: WorkflowConfig, 
  action: RebaseAction,
  ontoBranch?: string,
  branch?: string
): Promise<void> {
  if (action === 'abort') {
    await git(['rebase', '--abort']);
    return;
  }
  
  if (action === 'continue') {
    await git(['rebase', '--continue']);
    return;
  }
  
  if (action === 'skip') {
    await git(['rebase', '--skip']);
    return;
  }
  
  if (!ontoBranch) {
    throw new Error('Target branch required for rebase');
  }
  
  // Fetch latest
  await fetchAll();
  
  // Get current branch if not specified
  const currentBranch = branch || await getCurrentBranch();
  
  // If specified branch is different from current, checkout to it
  if (branch && branch !== await getCurrentBranch()) {
    console.log(`Checking out ${branch}...`);
    await git(['checkout', branch]);
  }
  
  // Verify target exists
  const branches = await getBranches();
  const branchNames = branches.map(b => b.name);
  if (!branchNames.includes(ontoBranch)) {
    throw new Error(`Target branch '${ontoBranch}' does not exist`);
  }
  
  // Rebase
  console.log(`Rebasing ${currentBranch} onto ${ontoBranch}...`);
  try {
    await git(['rebase', ontoBranch]);
    console.log(`Successfully rebased ${currentBranch} onto ${ontoBranch}`);
  } catch (error) {
    console.error('\n⚠️  Rebase conflict detected!');
    console.error('Options:');
    console.error('  git-workflow rebase --continue  - Continue after resolving');
    console.error('  git-workflow rebase --abort    - Abort the rebase');
    console.error('  git-workflow rebase --skip     - Skip this commit');
    throw error;
  }
}

/**
 * Interactive rebase
 */
export async function interactiveRebase(ontoBranch: string, count: number = 10): Promise<void> {
  await git(['rebase', '-i', `${ontoBranch}~${count}`, ontoBranch]);
}

/**
 * Force push with lease (safer than force push)
 */
export async function forcePushWithLease(branch: string): Promise<void> {
  console.log(`Force pushing ${branch} with lease...`);
  await git(['push', '--force-with-lease', 'origin', branch]);
}
