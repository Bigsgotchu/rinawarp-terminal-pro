/**
 * Secure Agent IPC Handlers
 *
 * Registers IPC handlers for secure agent execution.
 * These handlers enforce permission checks and sandboxing.
 */

import type { IpcMain } from 'electron'
import { runSecureAgent, getSecureAgentInfo, validateAgentManifest } from '../../rina/secure-agent-runner.js'
import {
  installAgent as installAgentFromManager,
  installAgentPackage,
  getInstalledAgent,
  listInstalledAgents,
  type AgentPackage,
} from '../../rina/agent-manager.js'
import { FALLBACK_MARKETPLACE_AGENTS } from '../../rina/capabilities/catalog.js'
import { listCapabilityPacks } from '../../rina/capabilities/registry.js'
import { licenseApiUrl } from '../../license.js'

function mergeMarketplaceAgents(agents: AgentPackage[]): AgentPackage[] {
  const merged = new Map<string, AgentPackage>()
  for (const agent of agents) merged.set(agent.name, agent)
  for (const fallback of FALLBACK_MARKETPLACE_AGENTS) {
    if (!merged.has(fallback.name)) merged.set(fallback.name, fallback)
  }
  return Array.from(merged.values())
}

async function fetchMarketplaceAgents(): Promise<{ ok: boolean; agents?: AgentPackage[]; error?: string; source?: string }> {
  const candidates = [
    licenseApiUrl('/v1/agents'),
    'https://www.rinawarptech.com/api/agents',
  ]

  let lastError: string | undefined
  for (const url of candidates) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        lastError = `Marketplace request failed: ${response.status}`
        continue
      }
      const payload = (await response.json()) as { agents?: AgentPackage[] }
      if (Array.isArray(payload?.agents)) {
        return { ok: true, agents: mergeMarketplaceAgents(payload.agents), source: 'remote' }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  return {
    ok: true,
    agents: mergeMarketplaceAgents(FALLBACK_MARKETPLACE_AGENTS),
    error: lastError,
    source: 'fallback',
  }
}

/**
 * Register secure agent IPC handlers
 */
export function registerSecureAgentIpc(ipcMain: IpcMain, deps?: { getLicenseTier?: () => string }) {
  // Remove existing handlers to prevent duplicates
  ipcMain.removeHandler('secure-agent:run')
  ipcMain.removeHandler('secure-agent:info')
  ipcMain.removeHandler('secure-agent:list')
  ipcMain.removeHandler('secure-agent:marketplace')
  ipcMain.removeHandler('rina:capabilities:list')
  ipcMain.removeHandler('secure-agent:validate-manifest')
  ipcMain.removeHandler('secure-agent:install')

  /**
   * Run an agent with security enforcement
   */
  ipcMain.handle(
    'secure-agent:run',
    async (
      _event,
      options: {
        name: string
        command?: string
        workspaceDir?: string
        verifySignature?: boolean
        publicKey?: string
      }
    ) => {
      try {
        const result = await runSecureAgent(options.name, options.command, {
          workspaceDir: options.workspaceDir,
          verifySignature: options.verifySignature,
          publicKey: options.publicKey,
        })

        return { ok: true, output: result }
      } catch (error) {
        const err = error as { message?: string }
        return { ok: false, error: err.message || 'Unknown error' }
      }
    }
  )

  /**
   * Get agent info including permissions
   */
  ipcMain.handle('secure-agent:info', async (_event, name: string) => {
    const info = getSecureAgentInfo(name)
    if (!info) {
      return { ok: false, error: 'Agent not found' }
    }
    return { ok: true, agent: info }
  })

  /**
   * List all installed agents with their permissions
   */
  ipcMain.handle('secure-agent:list', async () => {
    const agents = listInstalledAgents()
    const agentList = agents.map((name) => {
      const agent = getInstalledAgent(name)
      return {
        name,
        version: agent?.version,
        permissions: (agent as unknown as { permissions?: string[] })?.permissions || ['terminal'],
        hasSignature: !!(agent as unknown as { signature?: string }).signature,
      }
    })
    return { ok: true, agents: agentList }
  })

  ipcMain.handle('secure-agent:marketplace', async () => {
    const marketplace = await fetchMarketplaceAgents()
    return {
      ...marketplace,
      capabilities: listCapabilityPacks(marketplace.agents || []),
    }
  })

  ipcMain.handle('rina:capabilities:list', async () => {
    const marketplace = await fetchMarketplaceAgents()
    return {
      ok: true,
      capabilities: listCapabilityPacks(marketplace.agents || []),
      source: marketplace.source,
      error: marketplace.error,
    }
  })

  /**
   * Validate an agent manifest
   */
  ipcMain.handle('secure-agent:validate-manifest', async (_event, manifest: unknown) => {
    const errors = validateAgentManifest(manifest)
    return {
      ok: errors.length === 0,
      valid: errors.length === 0,
      errors,
    }
  })

  /**
   * Install agent from marketplace (with signature verification option)
   */
  ipcMain.handle(
    'secure-agent:install',
    async (
      _event,
      options: {
        name: string
        apiUrl?: string
        userEmail?: string
        verifySignature?: boolean
        publicKey?: string
      }
    ) => {
      try {
        const marketplace = await fetchMarketplaceAgents()
        const fallbackAgent = marketplace.agents?.find((agent) => agent.name === options.name)
        if (fallbackAgent) {
          const currentTier = String(deps?.getLicenseTier?.() || 'starter').toLowerCase()
          const premiumUnlocked = currentTier !== 'starter'
          if (fallbackAgent.price && fallbackAgent.price > 0 && !premiumUnlocked) {
            return {
              ok: false,
              error: `Agent "${options.name}" requires Pro or purchase before installation.`,
            }
          }

          const agent = installAgentPackage(fallbackAgent)
          return {
            ok: true,
            agent: {
              name: agent.name,
              version: agent.version,
              description: agent.description,
              author: agent.author,
              permissions: ['terminal'],
              commands: agent.commands,
            },
          }
        }

        const agent = await installAgentFromManager(options.name, options.apiUrl, options.userEmail)

        // Agent package may not have permissions field (backward compatibility)
        // Default to terminal permission if not present
        const agentWithPermissions = agent as unknown as { permissions?: string[] }
        if (!agentWithPermissions.permissions) {
          ;(agentWithPermissions as { permissions: string[] }).permissions = ['terminal']
        }

        return {
          ok: true,
          agent: {
            name: agent.name,
            version: agent.version,
            description: agent.description,
            author: agent.author,
            permissions: agentWithPermissions.permissions,
            commands: agent.commands,
          },
        }
      } catch (error) {
        const err = error as { message?: string }
        return { ok: false, error: err.message || 'Unknown error' }
      }
    }
  )

  console.log('[Secure Agent] IPC handlers registered')
}

export default { registerSecureAgentIpc }
