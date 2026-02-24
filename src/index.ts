#!/usr/bin/env node

import { Command } from 'commander'
import { initWorkflow } from './lib/repo'
import { detectRepoType } from './lib/repo'

const program = new Command()

program
  .name('git-workflow')
  .description('Manage complex Git branching workflows')
  .version('1.0.0')

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

program.parse()
