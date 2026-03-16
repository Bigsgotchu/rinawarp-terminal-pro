#!/usr/bin/env node

/**
 * Install Agent CLI
 *
 * Usage: node tools/install-agent.ts <agent-name or agent-file.json>
 *
 * Example:
 *   node tools/install-agent.ts docker-cleanup
 *   node tools/install-agent.ts ./my-custom-agent.json
 *
 * This script installs an agent from the marketplace or a local file.
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
  permissions?: string[]
  commands: AgentCommand[]
  price?: number
}

const AGENTS_DIR = path.join(process.cwd(), 'agents')

async function installAgent(agentSpec: string, apiUrl?: string): Promise<void> {
  const baseUrl = apiUrl || 'https://rinawarptech.com'
  let agent: AgentPackage | null = null

  // Check if it's a local file
  if (agentSpec.endsWith('.json') && fs.existsSync(agentSpec)) {
    console.log(`Installing from local file: ${agentSpec}`)
    const content = fs.readFileSync(agentSpec, 'utf8')
    try {
      agent = JSON.parse(content)
    } catch (error) {
      console.error(`Error: Invalid JSON in file: ${error}`)
      process.exit(1)
    }
  } else {
    // Try to fetch from marketplace
    console.log(`Searching marketplace for: ${agentSpec}`)
    try {
      const response = await fetch(`${baseUrl}/v1/agents?name=${encodeURIComponent(agentSpec)}`)

      if (!response.ok) {
        console.error(`Error: Failed to fetch agent (${response.status})`)
        process.exit(1)
      }

      const result = await response.json()

      if (!result.agents || result.agents.length === 0) {
        console.error(`Error: Agent not found: ${agentSpec}`)
        process.exit(1)
      }

      agent = result.agents[0]
      if (!agent) {
        console.error(`Error: Could not parse agent from response`)
        process.exit(1)
      }
      console.log(`Found agent: ${agent.name} v${agent.version}`)
    } catch (error) {
      console.error(`Error: Failed to connect to marketplace: ${error}`)
      process.exit(1)
    }
  }

  if (!agent) {
    console.error(`Error: Could not resolve agent: ${agentSpec}`)
    process.exit(1)
  }

  // Validate agent structure
  const errors: string[] = []
  if (!agent.name) errors.push('name is required')
  if (!agent.version) errors.push('version is required')
  if (!agent.commands || !Array.isArray(agent.commands)) {
    errors.push('commands array is required')
  }

  if (errors.length > 0) {
    console.error(`Error: Invalid agent package:\n  ${errors.join('\n  ')}`)
    process.exit(1)
  }

  // Create agents directory if it doesn't exist
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true })
  }

  // Save agent to local agents directory
  const agentFileName = `${agent.name}.json`
  const agentFilePath = path.join(AGENTS_DIR, agentFileName)

  // Check if already exists
  if (fs.existsSync(agentFilePath)) {
    const existing = JSON.parse(fs.readFileSync(agentFilePath, 'utf8'))
    if (existing.version === agent.version) {
      console.log(`Agent ${agent.name} v${agent.version} is already installed.`)
      return
    }
    console.log(`Updating existing agent: ${agent.name}`)
  }

  fs.writeFileSync(agentFilePath, JSON.stringify(agent, null, 2))

  console.log(`\n✓ Agent installed successfully!`)
  console.log(`  Name: ${agent.name}`)
  console.log(`  Version: ${agent.version}`)
  console.log(`  Location: ${agentFilePath}`)
  console.log(`  Commands: ${agent.commands.map((c) => c.name).join(', ')}`)

  if (agent.permissions) {
    console.log(`  Permissions: ${agent.permissions.join(', ')}`)
  }
}

// Get arguments from command line
const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--help') {
  console.log(`RinaWarp Agent Installer
  
Usage: node install-agent.ts <agent-name or agent-file.json> [options]

Arguments:
  agent-name           Name of agent from marketplace OR path to JSON file
  agent-file.json      Path to a local agent JSON file

Options:
  --api-url <url>     Override the marketplace API URL (default: https://rinawarptech.com)
  --help              Show this help message

Examples:
  node install-agent.ts docker-cleanup
  node install-agent.ts ./my-agent.json
  node install-agent.ts security-audit --api-url http://localhost:5055
`)
  process.exit(args[0] === '--help' ? 0 : 1)
}

// Parse options
let agentSpec = args[0]
let apiUrl: string | undefined

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--api-url' && args[i + 1]) {
    apiUrl = args[i + 1]
    i++
  }
}

installAgent(agentSpec, apiUrl).catch((error) => {
  console.error(`Unexpected error: ${error}`)
  process.exit(1)
})
