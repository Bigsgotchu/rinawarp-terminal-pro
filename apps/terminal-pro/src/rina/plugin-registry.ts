/**
 * Plugin Registry - Lists and manages installed agents/plugins
 * Also provides dynamic tool registration for agents.
 */
import fs from 'fs'
import path from 'path'

const AGENTS_DIR = path.join(process.env.HOME || '.', '.rinawarp', 'agents')

export interface RegistryEntry {
  name: string
  description: string
  author: string
  version: string
  commands: string[]
  installedAt: string
}

/**
 * Tool interface for dynamic registration
 */
export interface Tool {
  name: string
  description: string
  run(input: Record<string, unknown>): Promise<unknown>
}

/**
 * Registered tools storage
 */
const registeredTools: Record<string, Tool> = {}

/**
 * Register a new tool
 * @param tool - The tool to register
 */
export function registerTool(tool: Tool): void {
  registeredTools[tool.name] = tool
  console.log(`[Plugin Registry] Registered tool: ${tool.name}`)
}

/**
 * Get a registered tool by name
 * @param name - The name of the tool
 * @returns The tool or undefined if not found
 */
export function getTool(name: string): Tool | undefined {
  return registeredTools[name]
}

/**
 * Get all registered tool names
 * @returns Array of tool names
 */
export function getToolNames(): string[] {
  return Object.keys(registeredTools)
}

/**
 * Execute a registered tool
 * @param name - The name of the tool
 * @param input - Input to pass to the tool
 * @returns The result of the tool execution
 * @throws Error if tool not found
 */
export async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  const tool = getTool(name)
  if (!tool) {
    throw new Error(`Tool not found: ${name}`)
  }
  return tool.run(input)
}

/**
 * Unregister a tool
 * @param name - The name of the tool to unregister
 * @returns True if tool was removed, false if not found
 */
export function unregisterTool(name: string): boolean {
  if (registeredTools[name]) {
    delete registeredTools[name]
    console.log(`[Plugin Registry] Unregistered tool: ${name}`)
    return true
  }
  return false
}

/**
 * Lists all installed agents in the registry
 * @returns Array of registered agent entries
 */
export function listInstalledAgents(): RegistryEntry[] {
  if (!fs.existsSync(AGENTS_DIR)) {
    return []
  }

  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json'))
  const agents: RegistryEntry[] = []

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')
      const agent = JSON.parse(content)
      agents.push({
        name: agent.name,
        description: agent.description,
        author: agent.author,
        version: agent.version,
        commands: agent.commands?.map((c: { name: string }) => c.name) || [],
        installedAt: agent._installedAt || new Date().toISOString(),
      })
    } catch (error) {
      console.error(`[Plugin Registry] Error reading ${file}:`, error)
    }
  }

  return agents
}

/**
 * Checks if an agent is installed
 * @param name - The name of the agent
 * @returns True if installed
 */
export function isAgentInstalled(name: string): boolean {
  if (!fs.existsSync(AGENTS_DIR)) {
    return false
  }
  return fs.existsSync(path.join(AGENTS_DIR, `${name}.json`))
}

/**
 * Gets the count of installed agents
 * @returns Number of installed agents
 */
export function getInstalledCount(): number {
  if (!fs.existsSync(AGENTS_DIR)) {
    return 0
  }
  return fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json')).length
}

export default {
  listInstalledAgents,
  isAgentInstalled,
  getInstalledCount,
  registerTool,
  getTool,
  getToolNames,
  runTool,
  unregisterTool,
}
