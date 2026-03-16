#!/usr/bin/env node

/**
 * List Agents CLI
 *
 * Usage: node tools/list-agents.ts [options]
 *
 * Example:
 *   node tools/list-agents.ts
 *   node tools/list-agents.ts --marketplace
 *   node tools/list-agents.ts --local
 *
 * This script lists all available agents from marketplace or local installation.
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

function listLocalAgents(): AgentPackage[] {
  const agents: AgentPackage[] = []

  if (!fs.existsSync(AGENTS_DIR)) {
    return agents
  }

  const files = fs.readdirSync(AGENTS_DIR)
  for (const file of files) {
    if (!file.endsWith('.json')) continue

    const filePath = path.join(AGENTS_DIR, file)
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const agent = JSON.parse(content) as AgentPackage
      agents.push(agent)
    } catch (error) {
      console.warn(`Warning: Failed to parse ${file}: ${error}`)
    }
  }

  return agents
}

async function listMarketplaceAgents(apiUrl?: string): Promise<AgentPackage[]> {
  const baseUrl = apiUrl || 'https://rinawarptech.com'

  try {
    const response = await fetch(`${baseUrl}/v1/agents`)

    if (!response.ok) {
      console.error(`Error: Failed to fetch agents (${response.status})`)
      process.exit(1)
    }

    const result = await response.json()
    return result.agents || []
  } catch (error) {
    console.error(`Error: Failed to connect to marketplace: ${error}`)
    process.exit(1)
  }
}

function printAgent(agent: AgentPackage, showDetails: boolean = false): void {
  console.log(`\n${agent.name} (v${agent.version})`)
  console.log(`  Author: ${agent.author}`)
  console.log(`  ${agent.description}`)
  console.log(`  Commands: ${agent.commands.map((c) => c.name).join(', ')}`)

  if (agent.permissions && agent.permissions.length > 0) {
    console.log(`  Permissions: ${agent.permissions.join(', ')}`)
  }

  if (agent.price !== undefined && agent.price > 0) {
    console.log(`  Price: $${agent.price}`)
  } else {
    console.log(`  Price: Free`)
  }

  if (showDetails) {
    console.log(`\n  Command Details:`)
    for (const cmd of agent.commands) {
      console.log(`    ${cmd.name}:`)
      for (const step of cmd.steps) {
        console.log(`      - ${step}`)
      }
    }
  }
}

// Get arguments from command line
const args = process.argv.slice(2)

const showLocal = args.includes('--local') || args.includes('-l')
const showMarketplace = args.includes('--marketplace') || args.includes('-m')
const showDetails = args.includes('--details') || args.includes('-d')
const showHelp = args.includes('--help') || args.includes('-h')

// Parse custom API URL
let apiUrl: string | undefined
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-url' && args[i + 1]) {
    apiUrl = args[i + 1]
    break
  }
}

if (showHelp) {
  console.log(`RinaWarp Agent Lister
  
Usage: node list-agents.ts [options]

Options:
  -l, --local         Show only locally installed agents
  -m, --marketplace   Show only marketplace agents
  -d, --details      Show detailed command information
  --api-url <url>    Override the marketplace API URL
  -h, --help         Show this help message

Examples:
  node list-agents.ts
  node list-agents.ts --local
  node list-agents.ts --marketplace
  node list-agents.ts --details
`)
  process.exit(0)
}

// Default: show both
const showBoth = !showLocal && !showMarketplace

// Use async IIFE to handle async operations
;(async () => {
  console.log('RinaWarp Agents\n===============')

  if (showBoth || showLocal) {
    const localAgents = listLocalAgents()
    console.log(`\n📁 Local Agents (${localAgents.length})`)

    if (localAgents.length === 0) {
      console.log('  No local agents installed.')
      console.log('  Run: node tools/install-agent.ts <agent-name>')
    } else {
      for (const agent of localAgents) {
        printAgent(agent, showDetails)
      }
    }
  }

  if (showBoth || showMarketplace) {
    console.log(`\n🌐 Marketplace Agents`)

    const marketplaceAgents = await listMarketplaceAgents(apiUrl)

    if (marketplaceAgents.length === 0) {
      console.log('  No marketplace agents found.')
    } else {
      for (const agent of marketplaceAgents) {
        printAgent(agent, showDetails)
      }
    }
  }

  console.log('\n')
})()
