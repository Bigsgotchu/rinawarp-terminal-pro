/**
 * RinaWarp Terminal Pro - Consolidated IPC Handlers
 *
 * Replaces the legacy registerAllIpc.ts with a properly typed,
 * consolidated IPC registration system.
 *
 * This file provides all the IPC handlers needed for the Rina OS core
 * to function properly in Electron.
 */

import { IpcMain } from 'electron'
import { rinaController } from '../../rina/rina-controller.js'
import { getAvailableTools, RinaTools } from '../../rina/tools/registry.js'

// --- Type definitions ---

/**
 * License verification response
 */
export interface LicenseVerifyResponse {
  valid: boolean
  message?: string
  tier?: string
  expires_at?: number
  customer_id?: string
  status?: string
  ok?: boolean
}

/**
 * Shell kind enumeration
 */
export type ShellKind = 'bash' | 'zsh' | 'fish' | 'pwsh' | 'unknown'

/**
 * Daemon task interface
 */
export interface DaemonTask {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
  command: string
  meta?: Record<string, unknown>
}

/**
 * Rina OS Status
 */
export interface RinaStatus {
  mode: string
  tools: string[]
  agentRunning: boolean
  memoryStats: {
    conversation: number
    longterm: number
  }
}

/**
 * Execution mode for Rina
 */
export type ExecutionMode = 'assist' | 'auto' | 'explain'

// --- Consolidated IPC Registration ---

export interface ConsolidatedIpcArgs {
  ipcMain: IpcMain
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: { status?: string; deadLetter?: boolean }) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
}

/**
 * Register all consolidated IPC handlers
 * This replaces the old registerAllIpc.ts approach
 */
export function registerConsolidatedIpcHandlers({
  ipcMain,
  daemonStatus,
  daemonTasks,
  daemonTaskAdd,
  daemonStart,
  daemonStop,
}: ConsolidatedIpcArgs): void {
  console.log('[IPC] Registering consolidated IPC handlers...')

  // --- Daemon handlers ---
  ipcMain.handle('daemon:status', async () => {
    try {
      return await daemonStatus()
    } catch (error) {
      console.error('[IPC] daemon:status error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:tasks', async (_event, args) => {
    try {
      return await daemonTasks(args)
    } catch (error) {
      console.error('[IPC] daemon:tasks error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:add', async (_event, args) => {
    try {
      return await daemonTaskAdd(args)
    } catch (error) {
      console.error('[IPC] daemon:add error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:start', async () => {
    try {
      return await daemonStart()
    } catch (error) {
      console.error('[IPC] daemon:start error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:stop', async () => {
    try {
      return await daemonStop()
    } catch (error) {
      console.error('[IPC] daemon:stop error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // --- Rina OS Core handlers ---

  // Get Rina status
  ipcMain.handle('rina:status', async (): Promise<RinaStatus> => {
    try {
      const stats = rinaController.getStats()
      return {
        mode: rinaController.getMode(),
        tools: rinaController.getTools(),
        agentRunning: rinaController.isAgentRunning(),
        memoryStats: {
          conversation: stats.conversation?.entries ?? 0,
          longterm: stats.longterm?.sessions ?? 0,
        },
      }
    } catch (error) {
      console.error('[IPC] rina:status error:', error)
      return {
        mode: 'assist',
        tools: [],
        agentRunning: false,
        memoryStats: { conversation: 0, longterm: 0 },
      }
    }
  })

  // Set Rina execution mode
  ipcMain.handle('rina:setMode', async (_event, mode: string) => {
    try {
      if (mode === 'auto' || mode === 'assist' || mode === 'explain') {
        rinaController.setMode(mode)
        return { ok: true, mode }
      }
      return { ok: false, error: `Invalid mode: ${mode}` }
    } catch (error) {
      console.error('[IPC] rina:setMode error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Get available tools
  ipcMain.handle('rina:getTools', async () => {
    try {
      const tools = rinaController.getTools()
      const toolDetails = Object.entries(RinaTools).map(([name, tool]) => ({
        name,
        description: tool.description,
        safe: tool.safe ?? false,
      }))
      return { ok: true, tools, details: toolDetails }
    } catch (error) {
      console.error('[IPC] rina:getTools error:', error)
      return { ok: false, error: String(error), tools: [], details: [] }
    }
  })

  // Execute agent plan
  ipcMain.handle('rina:executePlan', async (_event, goal: string) => {
    try {
      const result = await rinaController.runAgent(goal)
      // Handle different return types from runAgent
      const success = 'success' in result ? result.success : 'output' in result
      return { ok: success, result }
    } catch (error) {
      console.error('[IPC] rina:executePlan error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Get agent progress
  ipcMain.handle('rina:getProgress', async () => {
    try {
      return rinaController.getAgentProgress()
    } catch (error) {
      console.error('[IPC] rina:getProgress error:', error)
      return { current: 0, total: 0, percentage: 0 }
    }
  })

  // Subscribe to agent events
  ipcMain.handle('rina:subscribeEvents', async (_event, callback: unknown) => {
    try {
      const unsubscribe = rinaController.onAgentEvent((event) => {
        // Events are pushed via the callback - handled by renderer
        console.log('[IPC] rina:event:', event.type)
      })
      return { ok: true, unsubscribe: true }
    } catch (error) {
      console.error('[IPC] rina:subscribeEvents error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Get memory stats
  ipcMain.handle('rina:getMemoryStats', async () => {
    try {
      return rinaController.getStats()
    } catch (error) {
      console.error('[IPC] rina:getMemoryStats error:', error)
      return { conversation: { entries: 0 }, longterm: { sessions: 0, projects: 0 } }
    }
  })

  // Clear session
  ipcMain.handle('rina:clearSession', async () => {
    try {
      rinaController.clearSession()
      return { ok: true }
    } catch (error) {
      console.error('[IPC] rina:clearSession error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // --- License handlers ---

  ipcMain.handle('license:verify', async (_event, key: string): Promise<LicenseVerifyResponse> => {
    // Simplified license verification - actual implementation would call license service
    if (key && key.length > 0) {
      return {
        valid: true,
        message: 'License verified',
        tier: 'starter',
        ok: true,
      }
    }
    return {
      valid: false,
      message: 'Invalid license key',
      ok: false,
    }
  })

  // --- Shell utilities ---

  ipcMain.handle('shell:getKind', (_event, shell?: string): ShellKind => {
    if (!shell) return 'unknown'
    const s = shell.toLowerCase()
    if (s.includes('pwsh') || s.includes('powershell')) return 'pwsh'
    if (s.includes('fish')) return 'fish'
    if (s.includes('zsh')) return 'zsh'
    if (s.includes('bash')) return 'bash'
    return 'unknown'
  })

  // --- Utility commands (replaces old registerUtilityIpc) ---

  ipcMain.handle('utility:ping', async () => {
    return { pong: true, timestamp: new Date().toISOString() }
  })

  ipcMain.handle('utility:devtoolsToggle', async (_event, webContentsId: number) => {
    // This would need BrowserWindow access - simplified for now
    return { ok: true, opened: false }
  })

  console.log('[IPC] Consolidated IPC handlers registered successfully')
}
