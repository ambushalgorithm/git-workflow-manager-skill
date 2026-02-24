import { git, branchExists, getCurrentBranch } from './git.js';
import type { WorkflowConfig } from '../types.js';

/**
 * Create a feature branch from develop
 */
export async function createFeatureBranch(
  config: WorkflowConfig, 
  branchName: string, 
  parentBranch: string = 'develop'
): Promise<void> {
  // Verify parent exists
  if (!await branchExists(parentBranch)) {
    throw new Error(`Parent branch '${parentBranch}' does not exist. Run 'git-workflow init' first.`);
  }
  
  // Check if branch already exists
  if (await branchExists(branchName)) {
    throw new Error(`Branch '${branchName}' already exists.`);
  }
  
  // Create branch from parent
  await git(['checkout', '-b', branchName, parentBranch]);
  console.log(`Created feature branch '${branchName}' from ${parentBranch}`);
}

/**
 * Create a hotfix branch from staging
 */
export async function createHotfixBranch(
  config: WorkflowConfig, 
  branchName: string
): Promise<void> {
  const parentBranch = 'staging';
  
  // Verify parent exists
  if (!await branchExists(parentBranch)) {
    throw new Error(`Parent branch '${parentBranch}' does not exist. Run 'git-workflow init' first.`);
  }
  
  // Check if branch already exists
  if (await branchExists(branchName)) {
    throw new Error(`Branch '${branchName}' already exists.`);
  }
  
  // Create branch from staging
  await git(['checkout', '-b', branchName, parentBranch]);
  console.log(`Created hotfix branch '${branchName}' from ${parentBranch}`);
}

/**
 * Create a release branch from develop
 */
export async function createReleaseBranch(
  config: WorkflowConfig, 
  branchName: string
): Promise<void> {
  const parentBranch = 'develop';
  
  // Verify parent exists
  if (!await branchExists(parentBranch)) {
    throw new Error(`Parent branch '${parentBranch}' does not exist. Run 'git-workflow init' first.`);
  }
  
  // Check if branch already exists
  if (await branchExists(branchName)) {
    throw new Error(`Branch '${branchName}' already exists.`);
  }
  
  // Create branch from develop
  await git(['checkout', '-b', branchName, parentBranch]);
  console.log(`Created release branch '${branchName}' from ${parentBranch}`);
}

/**
 * Delete a branch
 */
export async function deleteBranch(branchName: string, force = false): Promise<void> {
  const flag = force ? '-D' : '-d';
  await git(['branch', flag, branchName]);
  console.log(`Deleted branch '${branchName}'`);
}

/**
 * Merge a branch into its target
 */
export async function mergeBranch(
  branchName: string, 
  intoBranch: string = 'develop'
): Promise<void> {
  // Checkout target
  await git(['checkout', intoBranch]);
  
  // Merge
  await git(['merge', branchName]);
  console.log(`Merged '${branchName}' into ${intoBranch}`);
}
