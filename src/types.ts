export type RepoType = 'fork' | 'internal'

export type MergeStrategy = 'rebase' | 'merge'

export interface MergeStrategyConfig {
  default: MergeStrategy
  perBranch?: Record<string, MergeStrategy>
}

export interface CommitMetadata {
  hash: string
  status: 'pr-ready' | 'internal-only' | 'pending'
  message: string
  upstreamPr?: number
  tags: string[]
  createdAt: string
}

export interface TrackingConfig {
  commits: CommitMetadata[]
}

export interface WorkflowConfig {
  repoType: RepoType
  defaultBranch: string
  upstreamRemote?: string
  createdAt: string
  branchPrefixes: {
    feature: string
    hotfix: string
    release: string
  }
  hierarchy?: BranchHierarchy
  tracking?: TrackingConfig
  mergeStrategy?: MergeStrategyConfig
  defaultBaseBranch?: string // Optional: PR base branch (auto-detected if not set)
}

export interface BranchHierarchy {
  main: string
  staging: string
  develop: string
}

export const DEFAULT_BRANCH_HIERARCHY: BranchHierarchy = {
  main: 'main',
  staging: 'staging',
  develop: 'develop'
}
