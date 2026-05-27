/**
 * Installed agent manifest — read-only mapping (no execution).
 */

import fs from 'node:fs'
import path from 'node:path'

const AGENTS_DIR = path.join(process.env.HOME || '.', '.rinawarp', 'agents')

export type InstalledAgentCommand = {
  name: string
  steps: string[]
}

export type InstalledAgentManifest = {
  name: string
  description: string
  author: string
  version: string
  commands: InstalledAgentCommand[]
}

function readManifest(agentName: string): InstalledAgentManifest {
  const agentPath = path.join(AGENTS_DIR, `${agentName}.json`)

  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${agentName}" is not installed. Run "rina install ${agentName}" first.`)
  }

  let agent: InstalledAgentManifest
  try {
    agent = JSON.parse(fs.readFileSync(agentPath, 'utf8')) as InstalledAgentManifest
  } catch (error) {
    throw new Error(`Invalid agent JSON for "${agentName}": ${error}`)
  }

  if (!agent.commands?.length) {
    throw new Error(`Agent "${agentName}" has no commands defined`)
  }

  return agent
}

export function loadInstalledAgentCommand(
  agentName: string,
  commandName?: string,
): { manifest: InstalledAgentManifest; command: InstalledAgentCommand } {
  const manifest = readManifest(agentName)
  const command = commandName
    ? manifest.commands.find((entry) => entry.name === commandName)
    : manifest.commands[0]

  if (!command) {
    const available = manifest.commands.map((entry) => entry.name).join(', ')
    throw new Error(
      commandName
        ? `Command "${commandName}" not found in agent "${agentName}". Available: ${available}`
        : `Agent "${agentName}" has no commands`,
    )
  }

  if (!command.steps?.length) {
    throw new Error(`Command "${command.name}" in agent "${agentName}" has no steps`)
  }

  return { manifest, command }
}

export function getInstalledAgentInfo(name: string): {
  name: string
  description: string
  author: string
  version: string
  commands: string[]
} | null {
  try {
    const manifest = readManifest(name)
    return {
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      version: manifest.version,
      commands: manifest.commands.map((entry) => entry.name),
    }
  } catch {
    return null
  }
}
