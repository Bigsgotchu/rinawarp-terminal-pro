/**
 * RinaWarp Command Parser & Router
 *
 * Parses structured commands and routes to appropriate handlers.
 */

import { installAgent, listInstalledAgents } from '../agent-manager'
import { runAgent, getAgentInfo } from '../agent-runner'
import { listInstalledAgents as listPlugins } from '../plugin-registry'
import { explainError, explainErrorPattern } from '../error-explainer'
import { runDoctor, runDoctorFix } from '../doctor'
import { shareFix } from '../share'

export interface RinaCommand {
  action: string
  args: string[]
  raw: string
  flags: Record<string, boolean>
  options: Record<string, string>
}

/**
 * Parse a command string into structured format
 */
export function parseCommand(input: string): RinaCommand {
  const parts = input.trim().split(/\s+/)
  const action = parts[0]?.toLowerCase().replace(/^rina\s+/i, '') || ''
  const args: string[] = []

  // Parse args, flags, and options
  const flags: Record<string, boolean> = {}
  const options: Record<string, string> = {}

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]

    if (part.startsWith('--')) {
      // Long flag
      const flag = part.slice(2)
      const nextPart = parts[i + 1]

      if (nextPart && !nextPart.startsWith('-')) {
        options[flag] = nextPart
        i++
      } else {
        flags[flag] = true
      }
    } else if (part.startsWith('-')) {
      // Short flag
      const flag = part.slice(1)
      flags[flag] = true
    } else {
      args.push(part)
    }
  }

  return {
    action,
    args,
    raw: input,
    flags,
    options,
  }
}

/**
 * Check if input is a Rina command
 */
export function isRinaCommand(input: string): boolean {
  return /^\s*rina\s+\w+/i.test(input)
}

/**
 * Get command help
 */
export function getCommandHelp(action: string): string {
  const commands: Record<string, string> = {
    help: 'rina help [command] - Show help',
    deploy: 'rina deploy [path] - Deploy project',
    refactor: 'rina refactor <file> - Refactor code',
    build: 'rina build - Build project',
    test: 'rina test - Run tests',
    analyze: 'rina analyze - Analyze workspace',
    status: 'rina status - Show system status',
    context: 'rina context - Show context info',
    brain: 'rina brain - Toggle brain panel',
    workflow: 'rina workflow <name> - Run workflow',
    install: 'rina install <agent> - Install agent from marketplace',
    run: 'rina run <agent> - Run installed agent',
    plugins: 'rina plugins - List installed agents',
    market: 'rina market - Browse marketplace',
    explain: 'rina explain <error> - Explain an error message',
    doctor: 'rina doctor - Diagnose and fix project issues',
    share: 'rina share <plan> - Share a fix plan',
  }

  if (action) {
    return commands[action] || `Unknown command: ${action}`
  }

  return Object.values(commands).join('\n')
}

/**
 * Command Router - routes commands to handlers
 */
export class CommandRouter {
  private handlers: Map<string, (cmd: RinaCommand) => Promise<string>> = new Map()

  /**
   * Register a command handler
   */
  register(action: string, handler: (cmd: RinaCommand) => Promise<string>): void {
    this.handlers.set(action.toLowerCase(), handler)
  }

  /**
   * Route a parsed command
   */
  async route(cmd: RinaCommand): Promise<string> {
    const handler = this.handlers.get(cmd.action)

    if (handler) {
      try {
        return await handler(cmd)
      } catch (error) {
        return `Error: ${error}`
      }
    }

    return getCommandHelp(cmd.action)
  }

  /**
   * Route a raw string
   */
  async routeString(input: string): Promise<string> {
    if (!isRinaCommand(input)) {
      return '' // Not a Rina command, let terminal handle it
    }

    const cmd = parseCommand(input)
    return this.route(cmd)
  }

  /**
   * List registered commands
   */
  listCommands(): string[] {
    return Array.from(this.handlers.keys())
  }
}

/**
 * Default router with built-in commands
 */
export const commandRouter = new CommandRouter()

// Register built-in agent commands
commandRouter.register('install', async (cmd) => {
  const agentName = cmd.args[0]
  if (!agentName) {
    return 'Usage: rina install <agent-name>\nExample: rina install docker-repair'
  }
  try {
    const agent = await installAgent(agentName)
    return `✓ Installed agent: ${agent.name} v${agent.version}\n  Author: ${agent.author}\n  Description: ${agent.description}`
  } catch (error) {
    return `✗ Failed to install agent: ${error}`
  }
})

commandRouter.register('run', async (cmd) => {
  const agentName = cmd.args[0]
  const commandName = cmd.args[1]
  if (!agentName) {
    return 'Usage: rina run <agent-name> [command]\nExample: rina run docker-repair fix'
  }
  try {
    const output = await runAgent(agentName, commandName)
    return `✓ Agent "${agentName}" completed\n${output}`
  } catch (error) {
    return `✗ Failed to run agent: ${error}`
  }
})

commandRouter.register('plugins', async () => {
  const agents = listPlugins()
  if (agents.length === 0) {
    return 'No agents installed. Run "rina install <agent>" to add agents.'
  }
  const list = agents.map((a) => `- ${a.name} (${a.version}) - ${a.commands.length} command(s)`).join('\n')
  return `Installed agents:\n${list}`
})

commandRouter.register('market', async () => {
  try {
    const response = await fetch('https://rinawarptech.com/v1/agents')
    const data = (await response.json()) as { agents: any[] }
    const agents = data.agents || []

    if (agents.length === 0) {
      return 'No agents in marketplace yet.\nPublish your first agent with: node tools/publish-agent.js <agent.json>'
    }

    const list = agents
      .map((a) => `• ${a.name} v${a.version} (${a.downloads || 0} installs)${a.price ? ` - ${a.price}` : ' - Free'}`)
      .join('\n')

    return `RinaWarp Marketplace (${agents.length} agents):\n\n${list}\n\nInstall: rina install <agent-name>`
  } catch (error) {
    return `Failed to fetch marketplace: ${error}\nBrowse at: https://rinawarptech.com/agents`
  }
})

// Register explain command
commandRouter.register('explain', async (cmd) => {
  const errorText = cmd.args.join(' ')
  if (!errorText) {
    return `Usage: rina explain <error-message>\n\nExample:\n  rina explain "npm install failed with code 1"`
  }

  // Try pattern matching first (free, no API needed)
  const patternResult = explainErrorPattern(errorText)
  if (patternResult) {
    const shareResult = await shareFix([patternResult])
    return patternResult + '\n\n' + shareResult.message
  }

  // Use AI to explain
  const result = await explainError(errorText)
  return result
})

// Register doctor command
commandRouter.register('doctor', async (cmd) => {
  if (cmd.flags.fix) {
    return await runDoctorFix()
  }
  return await runDoctor()
})

// Register share command
commandRouter.register('share', async (cmd) => {
  const plan = cmd.args.join(' ')
  if (!plan) {
    return `Usage: rina share <fix-plan>\n\nExample:\n  rina share "1. Delete node_modules\n2. Run npm install"`
  }

  const planLines = plan.split(/\\n/).filter((l) => l.trim())
  return (await shareFix(planLines)).message
})
