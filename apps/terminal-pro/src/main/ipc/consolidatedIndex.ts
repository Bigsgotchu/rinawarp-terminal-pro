/**
 * RinaWarp Terminal Pro - Consolidated IPC Handlers
 *
 * Production-ready consolidated IPC registration file.
 * All _event parameters are properly typed with IpcMainInvokeEvent.
 * Integrates all required Rina Controller methods.
 *
 * Usage in main.ts:
 *   import { registerConsolidatedIpcHandlers } from './ipc/consolidatedIndex';
 *   registerConsolidatedIpcHandlers();
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { rinaController, type RinaResponse } from '../../rina/index.js'
import type { AgentPlan } from '../../rina/types.js'
import { trackAiMessage, trackQuickFix } from '../telemetry.js'

// --- Type Definitions ---

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

// --- Daemon API - Live implementations from main.ts ---
// These call the agentd API at http://127.0.0.1:5055

const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || 'http://127.0.0.1:5055'
const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || ''

type DaemonTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'

function buildAgentdHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (AGENTD_AUTH_TOKEN) {
    headers.authorization = `Bearer ${AGENTD_AUTH_TOKEN}`
  }
  return headers
}

async function agentdJson<T>(
  path: string,
  init: {
    method: 'GET' | 'POST'
    body?: unknown
  }
): Promise<T> {
  const res = await fetch(`${AGENTD_BASE_URL}${path}`, {
    method: init.method,
    headers: buildAgentdHeaders(),
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = data?.error || `${init.method} ${path} failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

const daemonStatus = async (): Promise<{ ok: boolean; daemon?: any; tasks?: any; error?: string }> => {
  try {
    return await agentdJson<{ ok: boolean; daemon?: any; tasks?: any }>('/v1/daemon/status', {
      method: 'GET',
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      daemon: { running: false, pid: null, storeDir: null },
      tasks: { total: 0, counts: {} },
    }
  }
}

const daemonTasks = async (args?: {
  status?: DaemonTaskStatus
  deadLetter?: boolean
}): Promise<{ ok: boolean; tasks?: DaemonTask[]; updatedAt?: string; error?: string }> => {
  const q = new URLSearchParams()
  if (args?.status) q.set('status', args.status)
  if (args?.deadLetter) q.set('deadLetter', '1')
  const suffix = q.size > 0 ? `?${q.toString()}` : ''
  try {
    return await agentdJson<{ ok: boolean; tasks?: any[]; updatedAt?: string }>(`/v1/daemon/tasks${suffix}`, {
      method: 'GET',
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      tasks: [],
    }
  }
}

const daemonTaskAdd = async (args: {
  type: string
  payload?: Record<string, unknown>
  maxAttempts?: number
}): Promise<{ ok: boolean; task?: DaemonTask; error?: string }> => {
  try {
    return await agentdJson<{ ok: boolean; task?: any }>('/v1/daemon/tasks', {
      method: 'POST',
      body: {
        type: args?.type,
        payload: args?.payload ?? {},
        maxAttempts: args?.maxAttempts,
      },
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const daemonStart = async (): Promise<{
  ok: boolean
  started?: boolean
  alreadyRunning?: boolean
  pid?: number
  error?: string
}> => {
  try {
    return await agentdJson<{ ok: boolean; started?: boolean; alreadyRunning?: boolean; pid?: number }>(
      '/v1/daemon/start',
      {
        method: 'POST',
        body: {},
      }
    )
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const daemonStop = async (): Promise<{
  ok: boolean
  stopped?: boolean
  stale?: boolean
  pid?: number
  error?: string
}> => {
  try {
    return await agentdJson<{ ok: boolean; stopped?: boolean; stale?: boolean; pid?: number }>('/v1/daemon/stop', {
      method: 'POST',
      body: {},
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// --- Consolidated IPC Registration ---

/**
 * Register all consolidated IPC handlers
 * This is the main entry point for IPC handler registration
 */
export function registerConsolidatedIpcHandlers(): void {
  console.log('[IPC] Registering consolidated IPC handlers...')

  // =====================
  // DAEMON HANDLERS
  // =====================

  ipcMain.handle('daemon:status', async (_event: IpcMainInvokeEvent) => {
    try {
      return await daemonStatus()
    } catch (error) {
      console.error('[IPC] daemon:status error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'daemon:tasks',
    async (_event: IpcMainInvokeEvent, args?: { status?: DaemonTaskStatus; deadLetter?: boolean }) => {
      try {
        return await daemonTasks(args)
      } catch (error) {
        console.error('[IPC] daemon:tasks error:', error)
        return { ok: false, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    'daemon:addTask',
    async (
      _event: IpcMainInvokeEvent,
      args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }
    ) => {
      try {
        return await daemonTaskAdd(args)
      } catch (error) {
        console.error('[IPC] daemon:addTask error:', error)
        return { ok: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('daemon:start', async (_event: IpcMainInvokeEvent) => {
    try {
      return await daemonStart()
    } catch (error) {
      console.error('[IPC] daemon:start error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('daemon:stop', async (_event: IpcMainInvokeEvent) => {
    try {
      return await daemonStop()
    } catch (error) {
      console.error('[IPC] daemon:stop error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // =====================
  // RINA CONTROLLER HANDLERS
  // =====================

  // Get Rina status
  ipcMain.handle('rina:status', async (_event: IpcMainInvokeEvent): Promise<RinaStatus> => {
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
  ipcMain.handle('rina:setMode', async (_event: IpcMainInvokeEvent, mode: string) => {
    try {
      if (mode === 'auto' || mode === 'assist' || mode === 'explain') {
        rinaController.setMode(mode as 'auto' | 'assist' | 'explain')
        return { ok: true, mode }
      }
      return { ok: false, error: `Invalid mode: ${mode}` }
    } catch (error) {
      console.error('[IPC] rina:setMode error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Get current Rina mode
  ipcMain.handle('rina:getMode', async (_event: IpcMainInvokeEvent): Promise<string> => {
    try {
      return rinaController.getMode()
    } catch (error) {
      console.error('[IPC] rina:getMode error:', error)
      return 'assist'
    }
  })

  // Get available tools
  ipcMain.handle('rina:getTools', async (_event: IpcMainInvokeEvent) => {
    try {
      const tools = rinaController.getTools()
      return { ok: true, tools }
    } catch (error) {
      console.error('[IPC] rina:getTools error:', error)
      return { ok: false, error: String(error), tools: [] }
    }
  })

  // Execute agent plan
  ipcMain.handle('rina:executePlan', async (_event: IpcMainInvokeEvent, plan: string | AgentPlan) => {
    try {
      const result = await rinaController.runAgent(plan)
      // Handle different return types from runAgent
      const success = 'success' in result ? result.success : 'ok' in result ? result.ok : true
      return { ok: success, result }
    } catch (error) {
      console.error('[IPC] rina:executePlan error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Get available plans
  ipcMain.handle('rina:getPlans', async (_event: IpcMainInvokeEvent): Promise<AgentPlan[]> => {
    try {
      return rinaController.getPlans()
    } catch (error) {
      console.error('[IPC] rina:getPlans error:', error)
      return []
    }
  })

  // Get agent progress
  ipcMain.handle('rina:getProgress', async (_event: IpcMainInvokeEvent) => {
    try {
      return rinaController.getAgentProgress()
    } catch (error) {
      console.error('[IPC] rina:getProgress error:', error)
      return { current: 0, total: 0, percentage: 0 }
    }
  })

  // Subscribe to agent events
  ipcMain.handle('rina:subscribeEvents', async (_event: IpcMainInvokeEvent) => {
    try {
      // Event subscription is handled by renderer via preload
      return { ok: true }
    } catch (error) {
      console.error('[IPC] rina:subscribeEvents error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Handle Rina message (natural language input)
  ipcMain.handle('rina:handleMessage', async (_event: IpcMainInvokeEvent, message: string): Promise<RinaResponse> => {
    try {
      // Track AI message for telemetry
      trackAiMessage()
      return await rinaController.handleMessage(message)
    } catch (error) {
      console.error('[IPC] rina:handleMessage error:', error)
      return {
        ok: false,
        intent: 'error',
        error: String(error),
      }
    }
  })

  // Execute confirmed command (with safety checks passed)
  ipcMain.handle(
    'rina:executeConfirmed',
    async (_event: IpcMainInvokeEvent, command: string): Promise<RinaResponse> => {
      try {
        return await rinaController.executeConfirmed(command)
      } catch (error) {
        console.error('[IPC] rina:executeConfirmed error:', error)
        return {
          ok: false,
          intent: 'confirmed',
          error: String(error),
        }
      }
    }
  )

  // Get memory stats
  ipcMain.handle('rina:getMemoryStats', async (_event: IpcMainInvokeEvent) => {
    try {
      return rinaController.getStats()
    } catch (error) {
      console.error('[IPC] rina:getMemoryStats error:', error)
      return { conversation: { entries: 0 }, longterm: { sessions: 0, projects: 0 } }
    }
  })

  // Get memory data
  ipcMain.handle('rina:getMemory', async (_event: IpcMainInvokeEvent) => {
    try {
      return rinaController.getMemory()
    } catch (error) {
      console.error('[IPC] rina:getMemory error:', error)
      return { project: null, recentProjects: [], topCommands: [], commandStats: {} }
    }
  })

  // Clear session
  ipcMain.handle('rina:clearSession', async (_event: IpcMainInvokeEvent) => {
    try {
      rinaController.clearSession()
      return { ok: true }
    } catch (error) {
      console.error('[IPC] rina:clearSession error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // Get current context
  ipcMain.handle('rina:getContext', async (_event: IpcMainInvokeEvent) => {
    try {
      return rinaController.getContext()
    } catch (error) {
      console.error('[IPC] rina:getContext error:', error)
      return '{}'
    }
  })

  // Set workspace root
  ipcMain.handle('rina:setWorkspaceRoot', async (_event: IpcMainInvokeEvent, path: string) => {
    try {
      rinaController.setWorkspaceRoot(path)
      return { ok: true, path }
    } catch (error) {
      console.error('[IPC] rina:setWorkspaceRoot error:', error)
      return { ok: false, error: String(error) }
    }
  })

  // =====================
  // LICENSE HANDLERS
  // =====================

  // Sync license verification (for quick checks)
  ipcMain.handle('license:verify', async (_event: IpcMainInvokeEvent, key: string): Promise<LicenseVerifyResponse> => {
    try {
      return rinaController.verifyLicense(key)
    } catch (error) {
      console.error('[IPC] license:verify error:', error)
      return {
        valid: false,
        message: String(error),
        ok: false,
      }
    }
  })

  // Async license verification (for production - calls backend API)
  ipcMain.handle(
    'license:verifyAsync',
    async (_event: IpcMainInvokeEvent, key: string): Promise<LicenseVerifyResponse> => {
      try {
        const result = await rinaController.verifyLicenseAsync(key)
        return {
          valid: result.valid,
          tier: result.tier,
          message: result.message,
          ok: result.valid,
        }
      } catch (error) {
        console.error('[IPC] license:verifyAsync error:', error)
        return {
          valid: false,
          message: String(error),
          ok: false,
        }
      }
    }
  )

  // Get current license tier
  ipcMain.handle('license:getTier', async (_event: IpcMainInvokeEvent): Promise<string> => {
    try {
      // Access the license tier from controller
      const status = rinaController.getStatus()
      return (status as any).licenseTier || 'free'
    } catch (error) {
      console.error('[IPC] license:getTier error:', error)
      return 'free'
    }
  })

  // =====================
  // SHELL HANDLERS
  // =====================

  ipcMain.handle('shell:getKind', async (_event: IpcMainInvokeEvent, shell?: string): Promise<ShellKind> => {
    try {
      return rinaController.getShellKind(shell) as ShellKind
    } catch (error) {
      console.error('[IPC] shell:getKind error:', error)
      return 'unknown'
    }
  })

  // =====================
  // UTILITY HANDLERS
  // =====================

  ipcMain.handle('utility:ping', async (_event: IpcMainInvokeEvent) => {
    return { pong: true, timestamp: new Date().toISOString() }
  })

  ipcMain.handle('utility:run', async (_event: IpcMainInvokeEvent, command: string) => {
    try {
      return rinaController.runUtility(command)
    } catch (error) {
      console.error('[IPC] utility:run error:', error)
      return { success: false, output: String(error) }
    }
  })

  ipcMain.handle('utility:devtoolsToggle', async (_event: IpcMainInvokeEvent, webContentsId: number) => {
    // This would need BrowserWindow access - simplified for now
    return { ok: true, opened: false }
  })

  console.log('[IPC] Consolidated IPC handlers registered successfully')
}

// Export types for external use
export type { RinaResponse, AgentPlan }
