/**
 * Agent Manager - Handles installation of agents from the marketplace
 */
import fs from 'fs'
import path from 'path'

const AGENTS_DIR = path.join(process.env.HOME || '.', '.rinawarp', 'agents')

export interface AgentPackage {
  name: string
  description: string
  author: string
  version: string
  commands: {
    name: string
    steps: string[]
  }[]
  downloads?: number
  price?: number
}

export function installAgentPackage(agent: AgentPackage): AgentPackage {
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true })
  }

  const agentPath = path.join(AGENTS_DIR, `${agent.name}.json`)
  fs.writeFileSync(agentPath, JSON.stringify(agent, null, 2), 'utf8')
  console.log(`[Agent Manager] Installed agent package: ${agent.name} v${agent.version}`)
  return agent
}

/**
 * Installs an agent from the marketplace
 * @param name - The name of the agent to install
 * @param apiBaseUrl - Optional base URL for the API (defaults to https://rinawarptech.com)
 * @param userEmail - Optional user email for purchase validation
 * @returns The installed agent package
 */
export async function installAgent(name: string, apiBaseUrl?: string, userEmail?: string): Promise<AgentPackage> {
  const baseUrl = apiBaseUrl || 'https://rinawarptech.com'

  const res = await fetch(`${baseUrl}/v1/agents/${encodeURIComponent(name)}`)

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Agent "${name}" not found in marketplace`)
    }
    throw new Error(`Failed to install agent: ${res.statusText}`)
  }

  const agent: AgentPackage = await res.json()

  // Handle paid agents
  if (agent.price && agent.price > 0) {
    if (!userEmail) {
      throw new Error(`Agent "${name}" is a paid agent (${agent.price}). Provide your email to purchase.`)
    }

    // Check if already purchased
    const purchaseRes = await fetch(`${baseUrl}/v1/agents/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: name, email: userEmail }),
    })

    const purchaseData = await purchaseRes.json()

    if (purchaseData.purchased) {
      console.log(`[Agent Manager] Agent "${name}" already purchased`)
    } else if (purchaseData.url) {
      // Need to purchase - try to open in browser if possible
      console.log(`[Agent Manager] Agent "${name}" requires purchase: ${purchaseData.url}`)

      // In Electron, we can open the purchase URL
      try {
        const { shell } = await import('electron')
        shell.openExternal(purchaseData.url)
      } catch {
        // Not in Electron environment
      }

      throw new Error(`Agent "${name}" requires purchase. Please complete payment at: ${purchaseData.url}`)
    }
  }

  // Create agents directory if it doesn't exist
  return installAgentPackage(agent)
}

/**
 * Uninstalls an agent from local storage
 * @param name - The name of the agent to uninstall
 */
export function uninstallAgent(name: string): void {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`)

  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${name}" is not installed`)
  }

  fs.unlinkSync(agentPath)
  console.log(`[Agent Manager] Uninstalled agent: ${name}`)
}

/**
 * Gets an installed agent from local storage
 * @param name - The name of the agent
 * @returns The agent package or null if not installed
 */
export function getInstalledAgent(name: string): AgentPackage | null {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`)

  if (!fs.existsSync(agentPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(agentPath, 'utf8')
    return JSON.parse(content) as AgentPackage
  } catch (error) {
    console.error(`[Agent Manager] Error reading agent "${name}":`, error)
    return null
  }
}

/**
 * Lists all installed agents
 * @returns Array of installed agent names
 */
export function listInstalledAgents(): string[] {
  if (!fs.existsSync(AGENTS_DIR)) {
    return []
  }

  const files = fs.readdirSync(AGENTS_DIR)
  return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''))
}

export default {
  installAgent,
  installAgentPackage,
  uninstallAgent,
  getInstalledAgent,
  listInstalledAgents,
}
