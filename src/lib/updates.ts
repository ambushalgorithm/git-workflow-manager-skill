import { git, branchExists, getCurrentBranch } from './git';
import { loadConfig, saveConfig } from './repo';
import type { WorkflowConfig } from '../types';

export type MergeStrategy = 'rebase' | 'merge';

export interface MergeStrategyConfig {
  default: MergeStrategy
  perBranch?: Record<string, MergeStrategy>
}

/**
 * Get merge strategy from config
 */
export function getMergeStrategy(config: WorkflowConfig, branch?: string): MergeStrategy {
  const strategy = config.mergeStrategy || { default: 'merge' };
  
  if (branch && strategy.perBranch?.[branch]) {
    return strategy.perBranch[branch];
  }
  
  return strategy.default;
}

/**
 * Set merge strategy in config
 */
export async function setMergeStrategy(strategy: MergeStrategy, branch?: string): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    throw new Error('No workflow config found. Run "git-workflow init" first.');
  }

  if (!config.mergeStrategy) {
    config.mergeStrategy = { default: 'merge' };
  }

  if (branch) {
    if (!config.mergeStrategy.perBranch) {
      config.mergeStrategy.perBranch = {};
    }
    config.mergeStrategy.perBranch[branch] = strategy;
  } else {
    config.mergeStrategy.default = strategy;
  }

  await saveConfig(config);
  
  if (branch) {
    console.log(`Set merge strategy for '${branch}' to '${strategy}'`);
  } else {
    console.log(`Set default merge strategy to '${strategy}'`);
  }
}

/**
 * Rebase branch onto parent
 */
export async function rebaseBranch(branch: string, onto: string): Promise<void> {
  const currentBranch = await getCurrentBranch();
  
  try {
    // Checkout the branch
    if (currentBranch !== branch) {
      await git(['checkout', branch]);
    }
    
    // Rebase onto target
    console.log(`Rebasing ${branch} onto ${onto}...`);
    await git(['rebase', onto]);
    console.log(`Successfully rebased ${branch} onto ${onto}`);
  } catch (error: any) {
    console.error(`Rebase failed: ${error.message}`);
    throw error;
  }
}

/**
 * Merge branch into target
 */
export async function mergeBranchInto(branch: string, into: string): Promise<void> {
  const currentBranch = await getCurrentBranch();
  
  try {
    // Checkout target
    if (currentBranch !== into) {
      await git(['checkout', into]);
    }
    
    // Merge
    console.log(`Merging ${branch} into ${into}...`);
    await git(['merge', branch]);
    console.log(`Successfully merged ${branch} into ${into}`);
  } catch (error: any) {
    console.error(`Merge failed: ${error.message}`);
    throw error;
  }
}

/**
 * Check if there are conflicts
 */
export async function hasConflicts(): Promise<boolean> {
  try {
    const status = await git(['status', '--porcelain']);
    return status.includes('UU') || status.includes('AA') || status.includes('DD');
  } catch {
    return false;
  }
}

/**
 * Abort current merge/rebase
 */
export async function abortOperation(): Promise<void> {
  try {
    await git(['merge', '--abort']);
  } catch {
    try {
      await git(['rebase', '--abort']);
    } catch {
      // Neither merge nor rebase in progress
    }
  }
  console.log('Operation aborted');
}

/**
 * Detect update type for a branch/PR
 */
export interface BranchUpdateType {
  type: 'ahead' | 'behind' | 'diverged' | 'up-to-date'
  ahead: number
  behind: number
}

/**
 * Compare branch with its upstream
 */
export async function getBranchUpdateType(branch: string): Promise<BranchUpdateType> {
  try {
    const output = await git(['rev-list', '--left-right', '--count', `${branch}...${branch}@{u}`]);
    const [aheadStr, behindStr] = output.trim().split(/\s+/);
    const ahead = parseInt(aheadStr, 10) || 0;
    const behind = parseInt(behindStr, 10) || 0;
    
    if (ahead > 0 && behind > 0) {
      return { type: 'diverged', ahead, behind };
    } else if (ahead > 0) {
      return { type: 'ahead', ahead, behind: 0 };
    } else if (behind > 0) {
      return { type: 'behind', ahead: 0, behind };
    } else {
      return { type: 'up-to-date', ahead: 0, behind: 0 };
    }
  } catch {
    // No upstream tracking
    return { type: 'up-to-date', ahead: 0, behind: 0 };
  }
}

/**
 * Smart update - uses configured strategy
 */
export async function smartUpdate(branch: string, onto: string): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    throw new Error('No workflow config found');
  }
  
  const strategy = getMergeStrategy(config, branch);
  const updateType = await getBranchUpdateType(branch);
  
  // Already up to date
  if (updateType.type === 'up-to-date' || updateType.type === 'ahead') {
    console.log(`Branch ${branch} is already up to date with ${onto}`);
    return;
  }
  
  // Need to update
  if (strategy === 'rebase') {
    await rebaseBranch(branch, onto);
  } else {
    await mergeBranchInto(onto, branch);
  }
}

/**
 * Fast-forward branch to target
 */
export async function fastForward(branch: string, to: string): Promise<void> {
  const currentBranch = await getCurrentBranch();
  
  try {
    if (currentBranch !== branch) {
      await git(['checkout', branch]);
    }
    
    console.log(`Fast-forwarding ${branch} to ${to}...`);
    await git(['merge', '--ff-only', to]);
    console.log(`Fast-forwarded ${branch} to ${to}`);
  } catch (error: any) {
    throw new Error(`Cannot fast-forward: ${error.message}`);
  }
}

/**
 * Get list of child branches (branches based on this one)
 */
export async function getChildBranches(baseBranch: string): Promise<string[]> {
  const children: string[] = [];
  
  try {
    const output = await git(['branch', '--format', '%(refname:short)']);
    const branches = output.trim().split('\n').filter(Boolean);
    
    for (const branch of branches) {
      // Check if branch is based on baseBranch by checking merge base
      try {
        const mergeBase = await git(['merge-base', baseBranch, branch]);
        const baseCommit = await git(['rev-parse', `${baseBranch}^{commit}`]);
        
        if (mergeBase.trim() === baseCommit.trim() && branch !== baseBranch) {
          children.push(branch);
        }
      } catch {
        // Skip branches that can't be compared
      }
    }
  } catch {
    // Ignore errors
  }
  
  return children;
}

/**
 * Update child branches after parent merge
 */
export async function updateChildBranches(baseBranch: string): Promise<void> {
  const children = await getChildBranches(baseBranch);
  
  if (children.length === 0) {
    console.log('No child branches to update');
    return;
  }
  
  console.log(`Found ${children.length} child branch(es): ${children.join(', ')}`);
  
  let strategy: MergeStrategy = 'merge';
  try {
    const config = await loadConfig();
    if (config) {
      strategy = getMergeStrategy(config);
    }
  } catch {
    // Use default
  }
  
  for (const child of children) {
    try {
      if (strategy === 'rebase') {
        await rebaseBranch(child, baseBranch);
      } else {
        await mergeBranchInto(baseBranch, child);
      }
    } catch (error: any) {
      console.error(`Failed to update ${child}: ${error.message}`);
    }
  }
}