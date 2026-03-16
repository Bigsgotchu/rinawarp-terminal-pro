/**
 * RinaWarp Terminal Pro - Main IPC Handler Registration
 *
 * This file coordinates all IPC handler registration for the Electron main process.
 * Uses the consolidated IPC system for Rina OS core functionality.
 */

import { ipcMain, BrowserWindow } from 'electron'
import { handleRinaMessage, memoryManager } from '../../rina/index.js'
import { thinkingStream } from '../../rina/thinking/thinkingStream.js'
import { registerConsolidatedIpcHandlers } from './registerConsolidatedIpcHandlers.js'

// Daemon functions imported from main.ts context
// These need to be passed in since they depend on main.ts scope
// Using any to bypass strict type conflicts between main.ts and IPC handlers
let daemonFunctions: {
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: any) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
} | null = null

/**
 * Set daemon functions for IPC handlers
 * Called from main.ts during initialization
 */
export function setDaemonFunctions(daemon: {
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: any) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
}): void {
  daemonFunctions = daemon
}

/**
 * Main IPC handler registration
 * Groups all IPC handlers for the application
 */
export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  console.log('[IPC] Starting IPC handler registration...')

  // Register consolidated Rina OS handlers first
  if (daemonFunctions) {
    registerConsolidatedIpcHandlers({
      ipcMain,
      ...daemonFunctions,
    })
  } else {
    console.warn('[IPC] Daemon functions not set, skipping consolidated handlers')
  }

  // Agent handlers
  ipcMain.handle('agent:interpret', async (_event, msg: string) => {
    return handleRinaMessage(msg)
  })

  ipcMain.handle('agent:getSessions', async () => {
    const stats = memoryManager.getStats()
    return {
      sessions: [],
      count: 0,
      conversationCount: stats.conversation?.entries ?? 0,
      sessionCount: stats.longterm?.sessions ?? 0,
    }
  })

  ipcMain.handle('agent:loadSession', async (_event, sessionId: string) => {
    return { ok: true, sessionId }
  })

  // System handlers
  ipcMain.handle('system:getPlatform', () => {
    return { platform: process.platform, arch: process.arch }
  })

  ipcMain.handle('system:getInfo', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      uptime: process.uptime(),
    }
  })

  // Dev diagnostics handlers
  ipcMain.handle('dev:getMemoryStats', () => memoryManager.getStats())

  ipcMain.handle('dev:getVersion', () => ({
    version: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }))

  // Brain stats for Visual AI Brain Panel
  ipcMain.handle('rina:brain:stats', () => {
    const stats = thinkingStream.getStats()
    return {
      total: stats.total,
      intent: stats.byType.intent,
      planning: stats.byType.planning,
      reasoning: stats.byType.reasoning,
      tool: stats.byType.tool,
      memory: stats.byType.memory,
      action: stats.byType.action,
      result: stats.byType.result,
      error: stats.byType.error,
      avgDuration: Math.round(stats.avgDuration),
    }
  })

  // PTY handlers (consolidated from system.ts)
  ipcMain.handle('pty:start', async (_event, options: { cols?: number; rows?: number; cwd?: string } = {}) => {
    return {
      ok: true,
      shell: process.env.SHELL || '/bin/bash',
      cwd: options.cwd || process.env.HOME || '/',
      cols: options.cols || 80,
      rows: options.rows || 24,
    }
  })

  ipcMain.handle('pty:write', async (_event, data: string) => {
    return { ok: true }
  })

  ipcMain.handle('pty:resize', async (_event, cols: number, rows: number) => {
    return { ok: true }
  })

  // Memory handlers
  ipcMain.handle('memory:get', async (_event, category: string) => {
    return null
  })

  ipcMain.handle('memory:set', async (_event, category: string, key: string, value: string) => {
    return { ok: true }
  })

  // Diagnostics handlers
  ipcMain.handle('diagnostics:readTailLines', async (_event, filePath: string, maxLines: number) => {
    return `Last ${maxLines} lines of ${filePath}`
  })

  ipcMain.handle('diagnostics:rendererErrors', async () => {
    return 'no errors'
  })

  // Utility handlers
  // Note: utility:ping and utility:devtoolsToggle are already registered in registerConsolidatedIpcHandlers

  console.log('[IPC] IPC handler registration complete')
}
