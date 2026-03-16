/**
 * Test Agent CLI Command
 *
 * Runs an agent in a local sandbox for testing.
 */

import fs from 'fs'
import path from 'path'
import { loadManifest, checkPermission, type Permission } from '../security/permissions.js'
import { runInSandbox, type ExecutionResult } from '../security/sandbox.js'

interface TestOptions {
  agentDir?: string
  timeout?: number
  verbose?: boolean
}

/**
 * Test an agent in the local sandbox
 */
export async function test(options: TestOptions): Promise<void> {
  const agentDir = options.agentDir || process.cwd()
  const manifestPath = path.join(agentDir, 'agent.json')

  console.log(`Testing agent from: ${agentDir}`)

  // Load manifest
  if (!fs.existsSync(manifestPath)) {
    console.error('Error: agent.json not found')
    process.exit(1)
  }

  let manifest: {
    name: string
    version: string
    entry: string
    permissions: string[]
  }

  try {
    manifest = loadManifest(agentDir)
  } catch (error) {
    console.error('Error: Failed to load manifest:', error)
    process.exit(1)
  }

  console.log(`Agent: ${manifest.name} v${manifest.version}`)
  console.log(`Permissions: ${manifest.permissions.join(', ')}`)

  // Load entry point code
  const entryPath = path.join(agentDir, manifest.entry)
  if (!fs.existsSync(entryPath)) {
    console.error(`Error: Entry point not found: ${entryPath}`)
    process.exit(1)
  }

  const code = fs.readFileSync(entryPath, 'utf8')
  console.log(`\nRunning agent in sandbox...`)
  console.log(`Timeout: ${options.timeout || 30000}ms\n`)

  // Run in sandbox
  const result = runInSandbox(code, manifest.permissions as Permission[], {
    timeout: options.timeout || 30000,
    workingDirectory: agentDir,
  })

  if (result.success) {
    console.log('✓ Agent executed successfully')
    console.log(`  Execution time: ${result.executionTimeMs}ms`)
    if (result.output) {
      console.log(`\nOutput:\n${result.output}`)
    }
  } else {
    console.error('✗ Agent execution failed')
    console.error(`  Error: ${result.error}`)
    console.error(`  Execution time: ${result.executionTimeMs}ms`)
    process.exit(1)
  }
}

/**
 * Parse CLI arguments for test command
 */
export function parseTestArgs(args: string[]): TestOptions {
  const options: TestOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--dir' && args[i + 1]) {
      options.agentDir = args[++i]
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10)
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    }
  }

  return options
}

export default { test, parseTestArgs }
