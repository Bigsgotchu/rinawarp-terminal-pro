#!/usr/bin/env node

/**
 * Publish Agent CLI
 *
 * Usage: node tools/publish-agent.ts <agent-file.json>
 *
 * Example:
 *   node tools/publish-agent.js my-agent.json
 *
 * This script publishes an agent to the RinaWarp marketplace.
 */

import fs from 'fs'
import path from 'path'

interface AgentCommand {
  name: string
  steps: string[]
}

interface AgentPackage {
  name: string
  description: string
  author: string
  version: string
  commands: AgentCommand[]
  price?: number
}

async function publishAgent(filePath: string, apiUrl?: string): Promise<void> {
  const baseUrl = apiUrl || 'https://rinawarptech.com'

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`)
    process.exit(1)
  }

  // Read and parse agent file
  let agentContent: string
  try {
    agentContent = fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    console.error(`Error: Failed to read file: ${error}`)
    process.exit(1)
  }

  let agent: AgentPackage
  try {
    agent = JSON.parse(agentContent)
  } catch (error) {
    console.error(`Error: Invalid JSON in file: ${error}`)
    process.exit(1)
  }

  // Validate agent structure
  const errors: string[] = []
  if (!agent.name) errors.push('name is required')
  if (!agent.description) errors.push('description is required')
  if (!agent.author) errors.push('author is required')
  if (!agent.version) errors.push('version is required')
  if (!agent.commands || !Array.isArray(agent.commands) || agent.commands.length === 0) {
    errors.push('commands array is required and must not be empty')
  }

  if (errors.length > 0) {
    console.error(`Error: Invalid agent package:\n  ${errors.join('\n  ')}`)
    process.exit(1)
  }

  // Validate each command has steps
  for (let i = 0; i < agent.commands.length; i++) {
    const cmd = agent.commands[i]
    if (!cmd.name) errors.push(`commands[${i}].name is required`)
    if (!cmd.steps || !Array.isArray(cmd.steps) || cmd.steps.length === 0) {
      errors.push(`commands[${i}].steps must be a non-empty array`)
    }
  }

  if (errors.length > 0) {
    console.error(`Error: Invalid agent structure:\n  ${errors.join('\n  ')}`)
    process.exit(1)
  }

  console.log(`Publishing agent: ${agent.name} v${agent.version}`)
  console.log(`  Author: ${agent.author}`)
  console.log(`  Description: ${agent.description}`)
  console.log(`  Commands: ${agent.commands.map((c) => c.name).join(', ')}`)
  if (agent.price) {
    console.log(`  Price: $${agent.price}`)
  }

  // Publish to marketplace
  try {
    const response = await fetch(`${baseUrl}/v1/agents/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agent),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error: Failed to publish agent (${response.status}): ${errorText}`)
      process.exit(1)
    }

    const result = await response.json()

    if (result.success) {
      console.log(`\n✓ Agent published successfully!`)
      console.log(`  Marketplace URL: ${baseUrl}/agents`)
    } else {
      console.error(`Error: Publish failed: ${result.error || 'Unknown error'}`)
      process.exit(1)
    }
  } catch (error) {
    console.error(`Error: Failed to connect to marketplace: ${error}`)
    process.exit(1)
  }
}

// Get file path from command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
  console.log(`RinaWarp Agent Publisher
  
Usage: node publish-agent.js <agent-file.json> [options]

Arguments:
  agent-file.json    Path to the agent package JSON file

Options:
  --api-url <url>   Override the marketplace API URL (default: https://rinawarptech.com)
  --help            Show this help message

Example:
  node publish-agent.js my-agent.json
  node publish-agent.js docker-repair.json --api-url http://localhost:5055
`)
  process.exit(args[0] === '--help' ? 0 : 1)
}

// Parse options
let filePath = args[0]
let apiUrl: string | undefined

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--api-url' && args[i + 1]) {
    apiUrl = args[i + 1]
    i++
  }
}

// Make path relative to current directory if needed
if (!path.isAbsolute(filePath)) {
  filePath = path.join(process.cwd(), filePath)
}

publishAgent(filePath, apiUrl).catch((error) => {
  console.error(`Unexpected error: ${error}`)
  process.exit(1)
})
