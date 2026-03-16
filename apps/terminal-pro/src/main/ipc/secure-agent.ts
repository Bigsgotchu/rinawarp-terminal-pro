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
  getInstalledAgent,
  listInstalledAgents,
} from '../../rina/agent-manager.js'

/**
 * Register secure agent IPC handlers
 */
export function registerSecureAgentIpc(ipcMain: IpcMain) {
  // Remove existing handlers to prevent duplicates
  ipcMain.removeHandler('secure-agent:run')
  ipcMain.removeHandler('secure-agent:info')
  ipcMain.removeHandler('secure-agent:list')
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
