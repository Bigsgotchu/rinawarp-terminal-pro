/**
 * Agent Runner - Handles execution of installed agents
 */
import fs from 'fs'
import path from 'path'
import { exec as nodeExec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(nodeExec)

const AGENTS_DIR = path.join(process.env.HOME || '.', '.rinawarp', 'agents')

export interface AgentCommand {
  name: string
  steps: string[]
}

/**
 * Runs an installed agent by executing its commands
 * @param name - The name of the agent to run
 * @param commandName - Optional command name (defaults to first command)
 * @returns The output from running the agent
 */
export async function runAgent(name: string, commandName?: string): Promise<string> {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`)

  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${name}" is not installed. Run "rina install ${name}" first.`)
  }

  let agentContent: string
  try {
    agentContent = fs.readFileSync(agentPath, 'utf8')
  } catch (error) {
    throw new Error(`Failed to read agent "${name}": ${error}`)
  }

  let agent: {
    name: string
    description: string
    author: string
    version: string
    commands: AgentCommand[]
  }

  try {
    agent = JSON.parse(agentContent)
  } catch (error) {
    throw new Error(`Invalid agent JSON for "${name}": ${error}`)
  }

  if (!agent.commands || agent.commands.length === 0) {
    throw new Error(`Agent "${name}" has no commands defined`)
  }

  // Find the command to run
  const command = commandName ? agent.commands.find((c) => c.name === commandName) : agent.commands[0]

  if (!command) {
    const availableCommands = agent.commands.map((c) => c.name).join(', ')
    throw new Error(
      commandName
        ? `Command "${commandName}" not found in agent "${name}". Available: ${availableCommands}`
        : `Agent "${name}" has no commands`
    )
  }

  if (!command.steps || command.steps.length === 0) {
    throw new Error(`Command "${command.name}" in agent "${name}" has no steps`)
  }

  console.log(`[Agent Runner] Running agent "${name}" command "${command.name}" (${command.steps.length} steps)`)

  const outputs: string[] = []

  for (let i = 0; i < command.steps.length; i++) {
    const step = command.steps[i]
    console.log(`[Agent Runner] Step ${i + 1}/${command.steps.length}: ${step}`)

    try {
      const { stdout, stderr } = await execAsync(step, {
        timeout: 120000, // 2 minute timeout per step
        maxBuffer: 10 * 1024 * 1024, // 10MB max output
      })

      if (stdout) {
        console.log(stdout)
        outputs.push(stdout)
      }
      if (stderr) {
        console.error(stderr)
        outputs.push(`[stderr] ${stderr}`)
      }
    } catch (error) {
      const err = error as { message?: string; stdout?: string; stderr?: string }
      const errorOutput = err.stderr || err.message || 'Unknown error'
      console.error(`[Agent Runner] Step ${i + 1} failed:`, errorOutput)
      throw new Error(`Step ${i + 1} failed: ${errorOutput}`)
    }
  }

  console.log(`[Agent Runner] Agent "${name}" completed successfully`)

  return outputs.join('\n')
}

/**
 * Gets information about an installed agent without running it
 * @param name - The name of the agent
 * @returns Agent info or null if not installed
 */
export function getAgentInfo(name: string): {
  name: string
  description: string
  author: string
  version: string
  commands: string[]
} | null {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`)

  if (!fs.existsSync(agentPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(agentPath, 'utf8')
    const agent = JSON.parse(content)
    return {
      name: agent.name,
      description: agent.description,
      author: agent.author,
      version: agent.version,
      commands: agent.commands?.map((c: AgentCommand) => c.name) || [],
    }
  } catch {
    return null
  }
}

export default {
  runAgent,
  getAgentInfo,
}
