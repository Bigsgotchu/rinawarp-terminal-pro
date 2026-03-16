/**
 * Agent SDK Types
 *
 * TypeScript types for the RinaWarp Agent SDK.
 */

/**
 * Permission types
 */
export type Permission = 'terminal' | 'filesystem:read' | 'filesystem:write' | 'network' | 'git' | 'docker' | 'process'

/**
 * Valid permissions
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
 * Agent manifest
 */
export interface AgentManifest {
  /** Unique agent identifier (kebab-case) */
  name: string
  /** Semantic version */
  version: string
  /** Entry point file */
  entry: string
  /** Required permissions */
  permissions: Permission[]
  /** Agent description */
  description?: string
  /** Author information */
  author?: string
  /** Homepage URL */
  homepage?: string
  /** License */
  license?: string
  /** Keywords */
  keywords?: string[]
  /** Agent price in USD */
  price?: number
}

/**
 * Agent command
 */
export interface AgentCommand {
  /** Command name */
  name: string
  /** Command description */
  description?: string
  /** Steps to execute */
  steps: string[]
}

/**
 * Complete agent package
 */
export interface AgentPackage extends AgentManifest {
  /** Commands */
  commands: AgentCommand[]
  /** Signature */
  signature?: string
  /** Signature timestamp */
  signedAt?: string
  /** Public key ID */
  signedBy?: string
}

/**
 * Resource limits for execution
 */
export interface ResourceLimits {
  /** Timeout in milliseconds */
  timeoutMs?: number
  /** Max memory in bytes */
  maxMemoryBytes?: number
  /** Max CPU percentage */
  maxCpuPercent?: number
  /** Max file size in bytes */
  maxFileSizeBytes?: number
  /** Max number of files */
  maxFiles?: number
  /** Max network requests */
  maxNetworkRequests?: number
}

/**
 * Agent runtime options
 */
export interface AgentRuntimeOptions {
  /** Working directory */
  workingDirectory?: string
  /** Resource limits */
  limits?: ResourceLimits
  /** Environment variables */
  env?: Record<string, string>
  /** Whether to verify signature */
  verifySignature?: boolean
  /** Public key for signature verification */
  publicKey?: string
}

/**
 * Agent execution result
 */
export interface AgentResult {
  /** Whether execution succeeded */
  success: boolean
  /** Output from execution */
  output?: string
  /** Error message if failed */
  error?: string
  /** Execution time in milliseconds */
  executionTimeMs: number
  /** Memory used in bytes */
  memoryUsed?: number
  /** Network requests made */
  networkRequests?: number
}

/**
 * Agent test result
 */
export interface AgentTestResult {
  /** Test name */
  name: string
  /** Whether test passed */
  passed: boolean
  /** Error if failed */
  error?: string
  /** Execution time */
  timeMs: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether valid */
  valid: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings */
  warnings?: string[]
}

export type {
  Permission as PermissionType,
  AgentManifest as AgentManifestType,
  AgentCommand as AgentCommandType,
  AgentPackage as AgentPackageType,
  ResourceLimits as ResourceLimitsType,
  AgentRuntimeOptions as AgentRuntimeOptionsType,
  AgentResult as AgentResultType,
  AgentTestResult as AgentTestResultType,
  ValidationResult as ValidationResultType,
}
