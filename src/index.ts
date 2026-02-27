#!/usr/bin/env node

import { Command } from 'commander'
import { git, getCurrentBranch, branchExists } from './lib/git'
import { initWorkflow, detectRepoType, loadConfig } from './lib/repo'
import { syncStaging, syncDevelop, syncAll } from './lib/sync'
import { createFeatureBranch, createHotfixBranch, createReleaseBranch, deleteBranch, mergeBranch } from './lib/create'
import { rebaseOnto } from './lib/rebase'
import { tagCommit, listPRReadyCommits, listInternalOnlyCommits, listAllTrackedCommits, showStagingIntegrationDiff, removeCommitFromTracking, getCommitInfo } from './lib/commits'
import { runDailyCheck, generateDailyReport, formatDailyReport, listOpenPRs, checkUpstreamStatus, reportBlockers, showBranchesNeedingAttention, detectNewUpstreamCommits, type ListPROptions } from './lib/daily'
import { getMergeStrategy, setMergeStrategy, rebaseBranch, mergeBranchInto, hasConflicts, abortOperation, getBranchUpdateType, smartUpdate, fastForward, updateChildBranches } from './lib/updates'
import { createPRBranch, updatePRBranch, listPRBranches, createPR, syncFromPR } from './lib/pr-branch'

const program = new Command()

program
  .name('git-workflow')
  .description('Manage complex Git branching workflows')
  .version('1.0.0')

// Init command
program
  .command('init')
  .description('Initialize workflow on repository')
  .option('-f, --force', 'Force reinitialize if already initialized')
  .action(async (options) => {
    try {
      await initWorkflow(options.force)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// Detect command
program
  .command('detect')
  .description('Detect repository type (fork or internal)')
  .action(async () => {
    try {
      const type = await detectRepoType()
      console.log(`Repository type: ${type}`)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// Sync command
program
  .command('sync')
  .description('Sync branches in the workflow hierarchy')
  .argument('[branch]', 'Branch to sync (staging, develop, all)', 'all')
  .option('-f, --force', 'Force push after sync')
  .action(async (branch, options) => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository. Run "git-workflow init" first.')
      process.exit(1)
    }

    try {
      switch (branch) {
        case 'staging':
          await syncStaging(config, options.force)
          break
        case 'develop':
          await syncDevelop(config, options.force)
          break
        case 'all':
          await syncAll(config, options.force)
          break
        default:
          console.error(`Unknown branch: ${branch}. Use: staging, develop, or all`)
          process.exit(1)
      }
    } catch (error: any) {
      console.error('Sync failed:', error.message)
      process.exit(1)
    }
  })

// Create command
program
  .command('create')
  .description('Create a new feature, hotfix, or release branch')
  .argument('<type>', 'Branch type (feat, feature, hotfix, release)')
  .argument('<name>', 'Branch name')
  .option('-p, --parent <branch>', 'Parent branch', 'develop')
  .action(async (type, name, options) => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository. Run "git-workflow init" first.')
      process.exit(1)
    }

    try {
      // Normalize type
      const normalizedType = type === 'feature' ? 'feat' : type
      
      if (normalizedType === 'feat') {
        const branchName = `feat/${name}`
        await createFeatureBranch(config, branchName, options.parent)
        console.log(`Created feature branch '${branchName}' from ${options.parent}`)
      } else if (normalizedType === 'hotfix') {
        const branchName = `hotfix/${name}`
        await createHotfixBranch(config, branchName)
        console.log(`Created hotfix branch '${branchName}' from staging`)
      } else if (normalizedType === 'release') {
        const branchName = `release/${name}`
        await createReleaseBranch(config, branchName)
        console.log(`Created release branch '${branchName}' from develop`)
      } else {
        console.error(`Unknown branch type: ${type}. Use: feat, hotfix, or release`)
        process.exit(1)
      }
    } catch (error: any) {
      console.error('Create failed:', error.message)
      process.exit(1)
    }
  })

// Rebase command
program
  .command('rebase')
  .description('Rebase current branch onto parent')
  .argument('[parent]', 'Parent branch to rebase onto', 'develop')
  .option('--continue', 'Continue after resolving conflicts')
  .option('--abort', 'Abort current rebase')
  .option('--skip', 'Skip current commit')
  .action(async (parent, options) => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository. Run "git-workflow init" first.')
      process.exit(1)
    }

    try {
      if (options.abort) {
        await rebaseOnto(config, 'abort')
        console.log('Rebase aborted')
        return
      }
      
      if (options.continue) {
        await rebaseOnto(config, 'continue')
        console.log('Rebase continued')
        return
      }
      
      if (options.skip) {
        await rebaseOnto(config, 'skip')
        console.log('Skipped commit')
        return
      }
      
      await rebaseOnto(config, 'rebase', parent)
      console.log(`Rebased onto ${parent}`)
    } catch (error: any) {
      console.error('Rebase failed:', error.message)
      process.exit(1)
    }
  })

// Status command
program
  .command('status')
  .description('Show current workflow status')
  .action(async () => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository. Run "git-workflow init" first.')
      process.exit(1)
    }

    console.log('=== Git Workflow Status ===')
    console.log(`Repository type: ${config.repoType}`)
    console.log(`Default branch: ${config.defaultBranch}`)
    if (config.upstreamRemote) {
      console.log(`Upstream remote: ${config.upstreamRemote}`)
    }
  })

// Tag command - tag a commit with status
program
  .command('tag')
  .description('Tag a commit with status (pr-ready, internal-only, pending)')
  .argument('<hash>', 'Commit hash')
  .argument('<status>', 'Status (pr-ready, internal-only, pending)')
  .action(async (hash, status) => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository. Run "git-workflow init" first.')
      process.exit(1)
    }

    try {
      await tagCommit(hash, status as any)
    } catch (error: any) {
      console.error('Tag failed:', error.message)
      process.exit(1)
    }
  })

// List pr-ready commits
program
  .command('pr-ready')
  .description('List commits tagged as pr-ready')
  .action(async () => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository.')
      process.exit(1)
    }

    try {
      const commits = await listPRReadyCommits()
      console.log('=== PR-Ready Commits ===')
      if (commits.length === 0) {
        console.log('No PR-ready commits found.')
      } else {
        for (const commit of commits) {
          console.log(`${commit.hash.slice(0, 7)} - ${commit.message} (${commit.status})`)
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// List internal-only commits
program
  .command('internal')
  .description('List commits tagged as internal-only')
  .action(async () => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository.')
      process.exit(1)
    }

    try {
      const commits = await listInternalOnlyCommits()
      console.log('=== Internal-Only Commits ===')
      if (commits.length === 0) {
        console.log('No internal-only commits found.')
      } else {
        for (const commit of commits) {
          console.log(`${commit.hash.slice(0, 7)} - ${commit.message} (${commit.status})`)
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// List all tracked commits
program
  .command('commits')
  .description('List all tracked commits')
  .action(async () => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository.')
      process.exit(1)
    }

    try {
      const commits = await listAllTrackedCommits()
      console.log('=== Tracked Commits ===')
      if (commits.length === 0) {
        console.log('No tracked commits found.')
      } else {
        for (const commit of commits) {
          console.log(`${commit.hash.slice(0, 7)} - ${commit.message} [${commit.status}]`)
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// Show diff between staging and integration
program
  .command('diff')
  .description('Show diff between staging and integration')
  .action(async () => {
    const config = await loadConfig()
    
    if (!config) {
      console.error('Error: Not a git-workflow managed repository.')
      process.exit(1)
    }

    try {
      const diff = await showStagingIntegrationDiff()
      console.log(diff)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// Daily PR Status Check commands
program
  .command('daily')
  .description('Run daily check and generate report')
  .option('-a, --author <username>', 'Filter PRs by author')
  .option('-A, --assignee <username>', 'Filter PRs by assignee')
  .option('-b, --base <branch>', 'Filter PRs by base branch')
  .option('-l, --label <label>', 'Filter PRs by label')
  .option('-s, --state <state>', 'Filter PRs by state: {open|closed|merged|all}', 'open')
  .option('-L, --limit <number>', 'Limit number of PRs', '30')
  .action(async (options) => {
    try {
      const prOptions: ListPROptions = {
        author: options.author,
        assignee: options.assignee,
        base: options.base,
        label: options.label,
        state: options.state as 'open' | 'closed' | 'merged' | 'all',
        limit: parseInt(options.limit, 10),
      }
      const report = await runDailyCheck(prOptions)
      console.log(formatDailyReport(report))
    } catch (error: any) {
      console.error('Daily check failed:', error.message)
      process.exit(1)
    }
  })

program
  .command('prs')
  .description('List open pull requests')
  .option('-a, --author <username>', 'Filter by author')
  .option('-A, --assignee <username>', 'Filter by assignee')
  .option('-b, --base <branch>', 'Filter by base branch')
  .option('-l, --label <label>', 'Filter by label')
  .option('-s, --state <state>', 'Filter by state: {open|closed|merged|all}', 'open')
  .option('-L, --limit <number>', 'Maximum number of items', '30')
  .action(async (options) => {
    try {
      const prs = await listOpenPRs(options)
      console.log('=== Open PRs ===')
      if (prs.length === 0) {
        console.log('No open PRs found.')
      } else {
        for (const pr of prs) {
          const checks = pr.checksPassing ? '✅' : '❌'
          console.log(`#${pr.number}: ${pr.title} (${pr.baseBranch}) ${checks}`)
          console.log(`   ${pr.url}`)
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

program
  .command('upstream')
  .description('Check upstream status (for forks)')
  .action(async () => {
    try {
      const status = await checkUpstreamStatus()
      console.log('=== Upstream Status ===')
      console.log(`New commits: ${status.newCommits}`)
      console.log(`New PRs: ${status.newPRs.length}`)
      console.log(`Merged PRs: ${status.mergedPRs.length}`)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

program
  .command('blockers')
  .description('Show blockers')
  .action(async () => {
    try {
      const blockers = await reportBlockers()
      console.log('=== Blockers ===')
      
      if (blockers.staleBranches.length > 0) {
        console.log('Stale branches:', blockers.staleBranches.join(', '))
      }
      if (blockers.failedChecks.length > 0) {
        console.log('Failed checks:')
        blockers.failedChecks.forEach(check => console.log(`  - ${check}`))
      }
      if (blockers.staleBranches.length === 0 && blockers.failedChecks.length === 0) {
        console.log('No blockers found.')
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

program
  .command('attention')
  .description('Show branches needing attention')
  .action(async () => {
    try {
      const attention = await showBranchesNeedingAttention()
      console.log('=== Branches Needing Attention ===')
      if (attention.length === 0) {
        console.log('All branches up to date.')
      } else {
        for (const item of attention) {
          console.log(`${item.branch}: ${item.reason}`)
          console.log(`  → ${item.action}`)
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// Branch update commands
program
  .command('strategy')
  .description('Set or show merge strategy')
  .argument('[action]', 'Action: get, set', 'get')
  .argument('[strategy]', 'Strategy: rebase, merge (for set action)')
  .argument('[branch]', 'Branch name (optional, for branch-specific strategy)')
  .action(async (action, strategy, branch) => {
    try {
      if (action === 'set') {
        if (!strategy || (strategy !== 'rebase' && strategy !== 'merge')) {
          console.error('Error: Strategy must be "rebase" or "merge"')
          process.exit(1)
        }
        await setMergeStrategy(strategy as 'rebase' | 'merge', branch)
      } else {
        const config = await loadConfig()
        if (!config) {
          console.error('Error: Not initialized')
          process.exit(1)
        }
        const s = config.mergeStrategy?.default || 'merge'
        console.log(`Default merge strategy: ${s}`)
        if (config.mergeStrategy?.perBranch) {
          console.log('Branch-specific strategies:')
          for (const [b, strat] of Object.entries(config.mergeStrategy.perBranch)) {
            console.log(`  ${b}: ${strat}`)
          }
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

program
  .command('update')
  .description('Update branch to latest (uses strategy)')
  .argument('<branch>', 'Branch to update')
  .argument('[onto]', 'Branch to update onto', 'main')
  .action(async (branch, onto) => {
    try {
      const config = await loadConfig()
      if (!config) {
        console.error('Error: Not initialized')
        process.exit(1)
      }
      
      const strat = getMergeStrategy(config, branch)
      console.log(`Using ${strat} strategy to update ${branch} onto ${onto}`)
      
      await smartUpdate(branch, onto)
      console.log('Update complete')
    } catch (error: any) {
      console.error('Update failed:', error.message)
      process.exit(1)
    }
  })

program
  .command('status-branch')
  .description('Show branch sync status')
  .argument('[branch]', 'Branch to check', 'current')
  .action(async (branch) => {
    try {
      const currentBranch = await getCurrentBranch()
      const targetBranch = branch === 'current' ? currentBranch : branch
      
      const status = await getBranchUpdateType(targetBranch)
      console.log(`Branch: ${targetBranch}`)
      
      switch (status.type) {
        case 'ahead':
          console.log(`Status: ${status.ahead} commit(s) ahead of remote`)
          break
        case 'behind':
          console.log(`Status: ${status.behind} commit(s) behind remote`)
          break
        case 'diverged':
          console.log(`Status: Diverged - ${status.ahead} ahead, ${status.behind} behind`)
          break
        case 'up-to-date':
          console.log('Status: Up to date with remote')
          break
      }
    } catch (error: unknown) {
      console.error('Error:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

program
  .command('ff')
  .description('Fast-forward branch to target')
  .argument('<branch>', 'Branch to fast-forward')
  .argument('<to>', 'Target branch')
  .action(async (branch, to) => {
    try {
      await fastForward(branch, to)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

program
  .command('update-children')
  .description('Update child branches after parent merge')
  .argument('<baseBranch>', 'Base branch that was merged')
  .action(async (baseBranch) => {
    try {
      await updateChildBranches(baseBranch)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// PR Branch commands
const prBranch = program
  .command('pr-branch')
  .description('Manage PR branches')

prBranch
  .command('create')
  .description('Create PR branch from pr-ready commits')
  .argument('<name>', 'Name for the PR branch')
  .option('-f, --from <branch>', 'Source branch (default: feature branch)', '')
  .action(async (name, options) => {
    try {
      await createPRBranch(name, options.from || undefined)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

prBranch
  .command('update')
  .description('Update PR branch with new pr-ready commits')
  .argument('<name>', 'Name of the PR branch')
  .action(async (name) => {
    try {
      await updatePRBranch(name)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

prBranch
  .command('list')
  .description('List active PR branches')
  .action(async () => {
    try {
      const branches = await listPRBranches()
      if (branches.length === 0) {
        console.log('No PR branches found.')
      } else {
        console.log('PR branches:')
        for (const branch of branches) {
          console.log(`  - ${branch}`)
        }
      }
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

// PR commands
const pr = program
  .command('pr')
  .description('Create and manage PRs')

pr
  .command('create')
  .description('Create a PR (auto-generates description from commits if --body not provided)')
  .argument('<branch>', 'PR branch name (without -pr suffix)')
  .option('-t, --title <title>', 'PR title')
  .option('-b, --body <body>', 'PR body/description (auto-generated if omitted)')
  .option('-d, --draft', 'Create as draft PR')
  .action(async (branch, options) => {
    try {
      // Use branch name exactly as provided (e.g., feat/my-fancy-new-button)
      const title = options.title || branch;
      // Pass null to trigger auto-generation from commits
      const body = options.body || null;
      await createPR(title, body, `${branch}-pr`)
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

pr
  .command('sync')
  .description('Sync working branch after PR feedback')
  .argument('[branch]', 'Parent branch to sync from (default: develop)')
  .action(async (branch) => {
    try {
      await syncFromPR(branch || 'develop')
    } catch (error: any) {
      console.error('Error:', error.message)
      process.exit(1)
    }
  })

program.parse()
