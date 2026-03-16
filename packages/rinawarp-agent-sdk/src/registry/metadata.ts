/**
 * Registry - Upload / Download / Metadata helpers
 *
 * Interface with Cloudflare R2/KV for agent storage.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/**
 * Registry configuration
 */
export interface RegistryConfig {
  /** API base URL */
  apiUrl: string
  /** R2 bucket URL (for package uploads) */
  bucketUrl?: string
  /** API key for authentication */
  apiKey?: string
  /** Timeout for requests */
  timeout?: number
}

/**
 * Agent metadata for registry
 */
export interface AgentMetadata {
  /** Agent name */
  name: string
  /** Agent version */
  version: string
  /** Author */
  author: string
  /** Description */
  description: string
  /** Permissions */
  permissions: string[]
  /** Commands */
  commands: Array<{ name: string; description?: string }>
  /** Price */
  price?: number
  /** Downloads count */
  downloads: number
  /** Rating */
  rating?: number
  /** Signature */
  signature?: string
  /** Signed at */
  signedAt?: string
  /** Package hash */
  packageHash?: string
  /** Created at */
  createdAt: string
  /** Updated at */
  updatedAt: string
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean
  url?: string
  hash?: string
  error?: string
}

/**
 * Default registry config
 */
export const DEFAULT_CONFIG: RegistryConfig = {
  apiUrl: 'https://rinawarptech.com',
  timeout: 30000,
}

/**
 * Create agent metadata from package
 */
export function createMetadata(
  agent: {
    name: string
    version: string
    author: string
    description: string
    permissions: string[]
    commands: Array<{ name: string; description?: string }>
    price?: number
  },
  signature?: string,
  packageHash?: string
): AgentMetadata {
  const now = new Date().toISOString()

  return {
    name: agent.name,
    version: agent.version,
    author: agent.author,
    description: agent.description,
    permissions: agent.permissions,
    commands: agent.commands,
    price: agent.price,
    downloads: 0,
    signature,
    packageHash,
    signedAt: signature ? now : undefined,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Upload agent to registry
 */
export async function uploadAgent(agentPath: string, config: RegistryConfig = DEFAULT_CONFIG): Promise<UploadResult> {
  // Read agent package
  const packagePath = path.join(agentPath, 'agent.json')
  if (!fs.existsSync(packagePath)) {
    return { success: false, error: 'agent.json not found' }
  }

  const packageContent = fs.readFileSync(packagePath)
  const packageHash = crypto.createHash('sha256').update(packageContent).digest('hex')

  try {
    // Upload to registry
    const response = await fetch(`${config.apiUrl}/v1/agents/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        ...JSON.parse(packageContent.toString()),
        packageHash,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Upload failed: ${response.status} - ${error}` }
    }

    const result = await response.json()

    return {
      success: result.success,
      url: `${config.apiUrl}/agents/${JSON.parse(packageContent.toString()).name}`,
      hash: packageHash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Download agent from registry
 */
export async function downloadAgent(
  name: string,
  version?: string,
  config: RegistryConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; data?: AgentMetadata; error?: string }> {
  try {
    const url = version ? `${config.apiUrl}/v1/agents/${name}/${version}` : `${config.apiUrl}/v1/agents/${name}`

    const response = await fetch(url, {
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    })

    if (!response.ok) {
      return { success: false, error: `Download failed: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get agent metadata
 */
export async function getMetadata(
  name: string,
  config: RegistryConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; data?: AgentMetadata; error?: string }> {
  try {
    const response = await fetch(`${config.apiUrl}/v1/agents/${name}`, {
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    })

    if (!response.ok) {
      return { success: false, error: `Not found: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * List all agents
 */
export async function listAgents(
  config: RegistryConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; agents?: AgentMetadata[]; error?: string }> {
  try {
    const response = await fetch(`${config.apiUrl}/v1/agents`, {
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
    })

    if (!response.ok) {
      return { success: false, error: `List failed: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, agents: data.agents }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update agent metadata (e.g., downloads count)
 */
export async function updateMetadata(
  name: string,
  updates: Partial<AgentMetadata>,
  config: RegistryConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${config.apiUrl}/v1/agents/${name}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      return { success: false, error: `Update failed: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export type { RegistryConfig, AgentMetadata, UploadResult }
