#!/usr/bin/env node

/**
 * RinaWarp Agent SDK CLI
 *
 * Command line interface for creating, testing, and publishing agents.
 *
 * Usage:
 *   rina create-agent <name> [options]
 *   rina test [options]
 *   rina publish [options]
 *   rina install <name>
 *   rina --help
 */

import { createAgent, parseCreateArgs } from './create-agent.js'
import { test, parseTestArgs } from './test.js'

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
RinaWarp Agent SDK v1.0.0

Usage: rina <command> [options]

Commands:
  create-agent <name>    Create a new agent
  test                   Test agent in sandbox
  publish                Publish agent to marketplace
  install <name>         Install agent locally
  list                   List installed agents

Options:
  --help, -h             Show this help message
  --version, -v          Show version

Examples:
  rina create-agent my-agent --description "My first agent"
  rina test --timeout 60000
  rina publish --api-url http://localhost:5055
`)
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1)
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log('RinaWarp Agent SDK v1.0.0')
    process.exit(0)
  }

  const command = args[0]
  const commandArgs = args.slice(1)

  switch (command) {
    case 'create-agent':
      const createOptions = parseCreateArgs(commandArgs)
      await createAgent(createOptions)
      break

    case 'test':
      const testOptions = parseTestArgs(commandArgs)
      await test(testOptions)
      break

    case 'publish':
      // Publish command - simplified for now
      console.log('Publish command requires marketplace integration.')
      console.log('Use the standalone publish-agent tool for now.')
      process.exit(1)

    case 'install':
      // Install command
      console.log('Install command requires marketplace integration.')
      process.exit(1)

    case 'list':
      // List command
      const agentsDir = process.env.RINA_AGENTS_DIR || process.env.HOME + '/.rinawarp/agents'
      console.log(`Installed agents would be listed from: ${agentsDir}`)
      process.exit(0)

    default:
      console.error(`Unknown command: ${command}`)
      console.error("Run 'rina --help' for usage information")
      process.exit(1)
  }
}

// Run the CLI
main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
