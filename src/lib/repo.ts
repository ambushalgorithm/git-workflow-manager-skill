import * as git from './git'
import { RepoType, WorkflowConfig, DEFAULT_BRANCH_HIERARCHY } from '../types'

const CONFIG_FILE = '.git/workflow-config.json'

/**
 * Detect repository type (fork vs internal)
 * REPO-001
 */
export async function detectRepoType(): Promise<RepoType> {
  const isRepo = await git.isGitRepo()
  if (!isRepo) {
    throw new Error('Not a git repository')
  }

  const remotes = await git.getRemotes()
  const hasUpstream = remotes.some(r => r.name === 'upstream')

  return hasUpstream ? 'fork' : 'internal'
}

/**
 * Get the default branch name (master or main)
 */
export async function getDefaultBranch(): Promise<string> {
  // Check for main first, then master
  if (await git.branchExists('main')) {
    return 'main'
  }
  if (await git.branchExists('master')) {
    return 'master'
  }
  throw new Error('No default branch found (master or main required)')
}

/**
 * Load workflow config from .git/workflow-config.json
 */
export async function loadConfig(): Promise<WorkflowConfig | null> {
  try {
    const { readFile } = await import('fs/promises')
    const content = await readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Save workflow config to .git/workflow-config.json
 */
export async function saveConfig(config: WorkflowConfig): Promise<void> {
  const { writeFile } = await import('fs/promises')
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2))
}

/**
 * Initialize workflow on a repository
 * REPO-001, REPO-002, REPO-003, REPO-004, REPO-005
 */
export async function initWorkflow(force?: boolean): Promise<WorkflowConfig> {
  // Check if already initialized
  const existingConfig = await loadConfig()
  if (existingConfig && !force) {
    console.log('Workflow already initialized. Use --force to reinitialize.')
    return existingConfig
  }

  // Detect repo type
  const repoType = await detectRepoType()
  console.log(`Detected repo type: ${repoType}`)

  // Get default branch
  const defaultBranch = await getDefaultBranch()
  console.log(`Default branch: ${defaultBranch}`)

  // Get remotes for upstream URL if fork
  let upstreamRemote: string | undefined
  if (repoType === 'fork') {
    const remotes = await git.getRemotes()
    const upstream = remotes.find(r => r.name === 'upstream')
    upstreamRemote = upstream?.url
  }

  // Create branch hierarchy
  await createBranchHierarchy(repoType, defaultBranch)

  // Create config
  const config: WorkflowConfig = {
    repoType,
    defaultBranch,
    upstreamRemote,
    createdAt: new Date().toISOString(),
    branchPrefixes: {
      feature: 'feat/',
      hotfix: 'hotfix/',
      release: 'release/'
    }
  }

  await saveConfig(config)
  console.log('Workflow initialized successfully!')
  console.log(JSON.stringify(config, null, 2))

  return config
}

/**
 * Create branch hierarchy (staging, develop)
 */
export async function createBranchHierarchy(repoType: RepoType, mainBranch: string): Promise<void> {
  const hierarchy = DEFAULT_BRANCH_HIERARCHY

  // Get current branch to return to later
  const currentBranch = await git.getCurrentBranch()

  try {
    // Create staging branch from main
    if (!(await git.branchExists(hierarchy.staging))) {
      await git.checkout(mainBranch)
      await git.createBranchFrom(mainBranch, hierarchy.staging)
      await git.createEmptyCommit(`chore: Initialize ${hierarchy.staging} branch`)
      await git.pushBranch(hierarchy.staging)
      console.log(`Created and pushed ${hierarchy.staging}`)
    }

    // Create develop branch from staging
    if (!(await git.branchExists(hierarchy.develop))) {
      await git.checkout(hierarchy.staging)
      await git.createBranchFrom(hierarchy.staging, hierarchy.develop)
      await git.createEmptyCommit(`chore: Initialize ${hierarchy.develop} branch`)
      await git.pushBranch(hierarchy.develop)
      console.log(`Created and pushed ${hierarchy.develop}`)
    }
  } finally {
    // Return to original branch
    if (currentBranch) {
      await git.checkout(currentBranch)
    }
  }
}
