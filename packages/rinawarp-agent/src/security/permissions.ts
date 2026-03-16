/**
 * Agent Permission System
 *
 * Defines and validates permissions for agent execution.
 * Every agent must declare explicit permissions in its manifest.
 */

import fs from 'fs'
import path from 'path'

/**
 * Available permissions in the RinaWarp agent system
 */
export type Permission =
  | 'terminal' // Execute shell commands
  | 'filesystem:read' // Read files
  | 'filesystem:write' // Write/modify files
  | 'network' // Make HTTP requests
  | 'git' // Git operations
  | 'docker' // Docker operations
  | 'process' // Spawn child processes

/**
 * Valid permission values
 */
export const VALID_PERMISSIONS: Permission[] = [
  'terminal',
  'filesystem:read',
  'filesystem:write',
  'network',
  'git',
  'docker',
  'process',
]

/**
 * Agent manifest structure
 */
export interface AgentManifest {
  /** Unique agent identifier (kebab-case) */
  name: string
  /** Semantic version */
  version: string
  /** Entry point file */
  entry: string
  /** List of required permissions */
  permissions: Permission[]
  /** Agent description */
  description?: string
  /** Author information */
  author?: string
}

/**
 * Extended agent package with security metadata
 */
export interface SecureAgentPackage extends AgentManifest {
  /** Commands the agent can execute */
  commands: Array<{
    name: string
    steps: string[]
  }>
  /** Agent price in USD */
  price?: number
  /** Package signature */
  signature?: string
  /** Timestamp of signing */
  signedAt?: string
  /** Public key ID used for signing */
  signedBy?: string
}

/**
 * Check if an agent has a specific permission
 * @param agentPermissions - Array of permissions the agent has
 * @param required - The permission to check for
 * @throws Error if permission is denied
 */
export function checkPermission(agentPermissions: string[], required: string): void {
  // Normalize permission names for comparison
  const normalizedRequired = required.toLowerCase()
  const normalizedAvailable = agentPermissions.map((p) => p.toLowerCase())

  if (!normalizedAvailable.includes(normalizedRequired)) {
    throw new Error(`Permission denied: ${required}. Agent has: ${agentPermissions.join(', ') || 'none'}`)
  }
}

/**
 * Validate that all permissions in a manifest are valid
 * @param permissions - Array of permission strings
 * @returns Validation errors (empty if valid)
 */
export function validatePermissions(permissions: unknown): string[] {
  const errors: string[] = []

  if (!Array.isArray(permissions)) {
    return ['permissions must be an array']
  }

  if (permissions.length === 0) {
    return ['at least one permission is required']
  }

  for (let i = 0; i < permissions.length; i++) {
    const perm = permissions[i]
    if (typeof perm !== 'string') {
      errors.push(`permissions[${i}] must be a string`)
    } else if (!VALID_PERMISSIONS.includes(perm as Permission)) {
      errors.push(`permissions[${i}]: "${perm}" is not a valid permission. Valid: ${VALID_PERMISSIONS.join(', ')}`)
    }
  }

  return errors
}

/**
 * Validate an agent manifest
 * @param manifest - The manifest to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateManifest(manifest: unknown): string[] {
  const errors: string[] = []

  if (!manifest || typeof manifest !== 'object') {
    return ['manifest must be an object']
  }

  const m = manifest as Record<string, unknown>

  // Required fields
  if (typeof m.name !== 'string' || !m.name.trim()) {
    errors.push('name is required and must be a non-empty string')
  }

  if (typeof m.version !== 'string' || !m.version.trim()) {
    errors.push('version is required and must be a non-empty string')
  }

  if (typeof m.entry !== 'string' || !m.entry.trim()) {
    errors.push('entry is required and must be a non-empty string')
  }

  // Validate permissions
  const permErrors = validatePermissions(m.permissions)
  errors.push(...permErrors)

  return errors
}

/**
 * Load and parse an agent manifest from a directory
 * @param agentDir - Path to the agent directory
 * @returns The parsed manifest
 */
export function loadManifest(agentDir: string): AgentManifest {
  const manifestPath = path.join(agentDir, 'agent.json')

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Agent manifest not found: ${manifestPath}`)
  }

  const content = fs.readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(content)

  const errors = validateManifest(manifest)
  if (errors.length > 0) {
    throw new Error(`Invalid manifest:\n  ${errors.join('\n  ')}`)
  }

  return manifest as AgentManifest
}

/**
 * Get required permissions for a given tool/operation
 * @param tool - The tool name
 * @returns Required permissions
 */
export function getRequiredPermissions(tool: string): Permission[] {
  switch (tool) {
    case 'terminal':
      return ['terminal']
    case 'filesystem':
      return ['filesystem:read', 'filesystem:write']
    case 'git':
      return ['git', 'terminal']
    case 'docker':
      return ['docker', 'terminal']
    case 'http':
    case 'network':
      return ['network']
    default:
      return []
  }
}

/**
 * Create a default manifest template
 * @param name - Agent name
 * @returns Default manifest with minimal permissions
 */
export function createDefaultManifest(name: string): AgentManifest {
  return {
    name,
    version: '1.0.0',
    entry: 'index.js',
    permissions: ['terminal'],
    description: `Agent: ${name}`,
    author: 'developer',
  }
}
