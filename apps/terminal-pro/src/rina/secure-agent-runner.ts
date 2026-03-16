/**
 * Secure Agent Runner
 *
 * Integrates security layers (permissions, sandbox, signature verification)
 * into the RinaWarp Terminal Pro agent execution.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const AGENTS_DIR = path.join(process.env.HOME || '.', '.rinawarp', 'agents')

/**
 * Permission types
 */
type Permission = 'terminal' | 'filesystem:read' | 'filesystem:write' | 'network' | 'git' | 'docker' | 'process'

/**
 * Valid permissions
 */
const VALID_PERMISSIONS: Permission[] = [
  'terminal',
  'filesystem:read',
  'filesystem:write',
  'network',
  'git',
  'docker',
  'process',
]

/**
 * Agent manifest with security fields
 */
interface SecureAgentManifest {
  name: string
  version: string
  entry: string
  permissions: Permission[]
  description?: string
  author?: string
  signature?: string
  signedAt?: string
}

/**
 * Check if agent has required permission
 */
function checkPermission(permissions: string[], required: string): void {
  const normalized = required.toLowerCase()
  if (!permissions.map((p) => p.toLowerCase()).includes(normalized)) {
    throw new Error(`Permission denied: ${required}. Agent has: ${permissions.join(', ') || 'none'}`)
  }
}

/**
 * Verify agent signature (simplified - in production use proper key management)
 */
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

/**
 * Safe terminal execution with permission checks
 */
function safeExec(cmd: string, permissions: Permission[], cwd: string): string {
  checkPermission(permissions, 'terminal')

  // Block dangerous commands
  const blockedPatterns = [/rm\s+-rf\s+\//i, /:\(\)\{.*:\|:\&\}/i, /dd\s+if=.*of=/i, />\s*\/dev\//i]

  for (const pattern of blockedPatterns) {
    if (pattern.test(cmd)) {
      throw new Error(`Blocked dangerous command: ${cmd}`)
    }
  }

  const { execSync } = require('child_process')
  return execSync(cmd, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  })
}

/**
 * Safe filesystem read
 */
function safeRead(filePath: string, permissions: Permission[], baseDir: string): string {
  checkPermission(permissions, 'filesystem:read')

  const resolved = path.resolve(baseDir, filePath)
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Access outside workspace denied')
  }

  return fs.readFileSync(resolved, 'utf8')
}

/**
 * Run a secure agent
 */
export async function runSecureAgent(
  name: string,
  commandName?: string,
  options?: {
    workspaceDir?: string
    verifySignature?: boolean
    publicKey?: string
  }
): Promise<string> {
  const agentPath = path.join(AGENTS_DIR, `${name}.json`)

  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${name}" is not installed. Run "rina install ${name}" first.`)
  }

  // Load agent
  let agent: SecureAgentManifest & { commands: Array<{ name: string; steps: string[] }> }
  try {
    const content = fs.readFileSync(agentPath, 'utf8')
    agent = JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to read agent "${name}": ${error}`)
  }

  // Verify signature if required
  if (options?.verifySignature && agent.signature && options.publicKey) {
    const manifestWithoutSig = { ...agent }
    delete (manifestWithoutSig as Record<string, unknown>).signature
    delete (manifestWithoutSig as Record<string, unknown>).signedAt

    const isValid = verifySignature(JSON.stringify(manifestWithoutSig), agent.signature, options.publicKey)

    if (!isValid) {
      throw new Error('Agent signature verification failed')
    }
    console.log('[Secure Runner] Signature verified')
  }

  // Validate permissions exist
  if (!agent.permissions || !Array.isArray(agent.permissions)) {
    console.warn('[Secure Runner] No permissions defined, defaulting to terminal only')
    agent.permissions = ['terminal']
  }

  // Validate each permission is valid
  for (const perm of agent.permissions) {
    if (!VALID_PERMISSIONS.includes(perm as Permission)) {
      throw new Error(`Invalid permission: ${perm}`)
    }
  }

  // Find command to run
  const command = commandName ? agent.commands?.find((c) => c.name === commandName) : agent.commands?.[0]

  if (!command) {
    throw new Error(`Command "${commandName || 'default'}" not found`)
  }

  // Execute in workspace
  const workspaceDir = options?.workspaceDir || process.cwd()
  console.log(`[Secure Runner] Running "${name}" with permissions: ${agent.permissions.join(', ')}`)

  const outputs: string[] = []

  for (let i = 0; i < command.steps.length; i++) {
    const step = command.steps[i]
    console.log(`[Secure Runner] Step ${i + 1}/${command.steps.length}: ${step}`)

    try {
      const output = safeExec(step, agent.permissions, workspaceDir)
      if (output) {
        outputs.push(output)
      }
    } catch (error) {
      const err = error as { message?: string }
      throw new Error(`Step ${i + 1} failed: ${err.message}`)
    }
  }

  return outputs.join('\n')
}

/**
 * Get agent info with permission details
 */
export function getSecureAgentInfo(name: string): {
  name: string
  version: string
  permissions: string[]
  signature?: string
  signedAt?: string
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
      version: agent.version,
      permissions: agent.permissions || [],
      signature: agent.signature,
      signedAt: agent.signedAt,
    }
  } catch {
    return null
  }
}

/**
 * Validate agent manifest
 */
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
