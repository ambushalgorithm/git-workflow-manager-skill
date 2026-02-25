export type RepoType = 'fork' | 'internal'

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
  tracking?: TrackingConfig
}

export interface BranchHierarchy {
  main: string
  staging: string
  integration: string
  develop: string
}

export const DEFAULT_BRANCH_HIERARCHY: BranchHierarchy = {
  main: 'main',
  staging: 'staging',
  integration: 'integration',
  develop: 'develop'
}
