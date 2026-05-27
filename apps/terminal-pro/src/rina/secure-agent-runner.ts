/**
 * Secure agent manifest validation + runtime forward (no legacy shell).
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { loadInstalledAgentCommand } from './agents/installed-agent-manifest.js'
import { executionRecordToLegacyText, legacyPlanToRuntime } from '../runtime/bridge/RinaRuntimeBridge.js'

const AGENTS_DIR = path.join(process.env.HOME || '.', '.rinawarp', 'agents')

type Permission = 'terminal' | 'filesystem:read' | 'filesystem:write' | 'network' | 'git' | 'docker' | 'process'

const VALID_PERMISSIONS: Permission[] = [
  'terminal',
  'filesystem:read',
  'filesystem:write',
  'network',
  'git',
  'docker',
  'process',
]

function resolveSecureWorkspaceDir(explicit?: string): string {
  const candidate = String(explicit || process.env.RINA_WORKSPACE_ROOT || '').trim()
  if (!candidate) {
    throw new Error('Missing workspace directory for secure agent execution')
  }
  return candidate
}

interface SecureAgentManifest {
  name: string
  version: string
  entry: string
  permissions: Permission[]
  description?: string
  author?: string
  signature?: string
  signedAt?: string
  commands: Array<{ name: string; steps: string[] }>
}

function verifySignature(data: string, signature: string, publicKey: string): boolean {
  try {
    const verify = crypto.createVerify('SHA256')
    verify.update(data)
    verify.end()
    return verify.verify(publicKey, signature, 'hex')
  } catch {
    return false
  }
}

function readManifest(name: string): SecureAgentManifest {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`)
  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${name}" is not installed. Run "rina install ${name}" first.`)
  }
  return JSON.parse(fs.readFileSync(agentPath, 'utf8')) as SecureAgentManifest
}

export async function runSecureAgent(
  name: string,
  commandName?: string,
  options?: {
    workspaceDir?: string
    verifySignature?: boolean
    publicKey?: string
  },
): Promise<string> {
  const agent = readManifest(name)

  if (options?.verifySignature && agent.signature && options.publicKey) {
    const manifestWithoutSig = { ...agent }
    delete (manifestWithoutSig as Record<string, unknown>).signature
    delete (manifestWithoutSig as Record<string, unknown>).signedAt
    if (!verifySignature(JSON.stringify(manifestWithoutSig), agent.signature, options.publicKey)) {
      throw new Error('Agent signature verification failed')
    }
  }

  if (!agent.permissions?.length) {
    agent.permissions = ['terminal']
  }

  for (const perm of agent.permissions) {
    if (!VALID_PERMISSIONS.includes(perm as Permission)) {
      throw new Error(`Invalid permission: ${perm}`)
    }
  }

  const { manifest, command } = loadInstalledAgentCommand(name, commandName)
  const workspaceDir = resolveSecureWorkspaceDir(options?.workspaceDir)

  const prompt = [
    `Execute secure agent "${manifest.name}" command "${command.name}".`,
    `Permissions: ${agent.permissions.join(', ')}`,
    ...command.steps.map((step, index) => `${index + 1}. ${step}`),
  ].join('\n')

  const record = await legacyPlanToRuntime(prompt, workspaceDir)
  return executionRecordToLegacyText(record)
}

export function getSecureAgentInfo(name: string): {
  name: string
  version: string
  permissions: string[]
  signature?: string
  signedAt?: string
} | null {
  try {
    const agent = readManifest(name)
    return {
      name: agent.name,
      version: agent.version,
      permissions: agent.permissions || [],
      signature: agent.signature,
      signedAt: agent.signedAt,
    }
  } catch {
    return null
  }
}

export function validateAgentManifest(manifest: unknown): string[] {
  const errors: string[] = []
  const m = manifest as Record<string, unknown>

  if (!m.name) errors.push('name is required')
  if (!m.version) errors.push('version is required')
  if (!m.entry) errors.push('entry is required')

  if (!Array.isArray(m.permissions)) {
    errors.push('permissions must be an array')
  } else {
    for (const perm of m.permissions) {
      if (!VALID_PERMISSIONS.includes(perm as Permission)) {
        errors.push(`invalid permission: ${perm}`)
      }
    }
  }

  return errors
}

export default {
  runSecureAgent,
  getSecureAgentInfo,
  validateAgentManifest,
}
