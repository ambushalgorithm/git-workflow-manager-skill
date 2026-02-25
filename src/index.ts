#!/usr/bin/env node

import { Command } from 'commander'
import { initWorkflow, detectRepoType, loadConfig } from './lib/repo'
import { syncStaging, syncDevelop, syncAll } from './lib/sync'
import { createFeatureBranch, createHotfixBranch, createReleaseBranch, deleteBranch, mergeBranch } from './lib/create'
import { rebaseOnto } from './lib/rebase'
import { tagCommit, listPRReadyCommits, listInternalOnlyCommits, listAllTrackedCommits, showStagingIntegrationDiff, removeCommitFromTracking, getCommitInfo } from './lib/commits'

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

program.parse()
