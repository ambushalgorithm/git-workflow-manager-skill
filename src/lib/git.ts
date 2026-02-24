import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface GitRemote {
  name: string
  url: string
}

export interface GitBranch {
  name: string
  current: boolean
}

/**
 * Execute a git command and return the output
 */
export async function git(args: string[], cwd?: string): Promise<string> {
  try {
    // Join args with spaces, but quote args that contain spaces
    const cmd = 'git ' + args.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')
    const { stdout } = await execAsync(cmd, { cwd })
    return stdout.trim()
  } catch (error: any) {
    if (error.code === 128) {
      // Git error - could be no remotes, no branches, etc.
      throw new Error(error.message)
    }
    throw error
  }
}

/**
 * Check if we're in a git repository
 */
export async function isGitRepo(): Promise<boolean> {
  try {
    await git(['rev-parse', '--git-dir'])
    return true
  } catch {
    return false
  }
}

/**
 * Get list of all remotes
 */
export async function getRemotes(): Promise<GitRemote[]> {
  const output = await git(['remote', '-v'])
  if (!output) return []

  const remotes: GitRemote[] = []
  const lines = output.split('\n').filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/)
    if (match) {
      const [, name, url] = match
      remotes.push({ name, url })
    }
  }

  return remotes
}

/**
 * Get list of all branches (local and remote)
 */
export async function getBranches(): Promise<GitBranch[]> {
  const output = await git(['branch', '-a'])
  if (!output) return []

  const branches: GitBranch[] = []
  const lines = output.split('\n').filter(Boolean)

  for (const line of lines) {
    const current = line.startsWith('*')
    const name = line.replace(/^\*?\s*/, '').replace(/^remotes\/origin\//, '')
    // Skip HEAD pointers
    if (!name.includes('HEAD')) {
      branches.push({ name, current })
    }
  }

  return branches
}

/**
 * Check if a branch exists
 */
export async function branchExists(branch: string): Promise<boolean> {
  try {
    await git(['rev-parse', '--verify', branch])
    return true
  } catch {
    return false
  }
}

/**
 * Create a new branch (does not switch to it)
 */
export async function createBranch(branch: string): Promise<void> {
  await git(['branch', branch])
}

/**
 * Create an empty commit on current branch (to make it distinct)
 */
export async function createEmptyCommit(message: string): Promise<void> {
  await git(['commit', '--allow-empty', '-m', message])
}

/**
 * Checkout a branch
 */
export async function checkout(branch: string): Promise<void> {
  await git(['checkout', branch])
}

/**
 * Create branch from a starting point and switch to it
 */
export async function createBranchFrom(startPoint: string, newBranch: string): Promise<void> {
  await git(['checkout', '-b', newBranch, startPoint])
}

/**
 * Push a branch to origin with upstream tracking
 */
export async function pushBranch(branch: string): Promise<void> {
  await git(['push', '-u', 'origin', branch])
}

/**
 * Push multiple branches to origin
 */
export async function pushBranches(branches: string[]): Promise<void> {
  for (const branch of branches) {
    await pushBranch(branch)
  }
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(): Promise<string> {
  return await git(['branch', '--show-current'])
}

/**
 * Fetch all remotes
 */
export async function fetchAll(): Promise<void> {
  await git(['fetch', '--all'])
}
