/**
 * RinaWarp Terminal Pro - Main IPC Handler Registration
 *
 * This file coordinates all IPC handler registration for the Electron main process.
 * Uses the consolidated IPC system for Rina OS core functionality.
 */

import { createRequire } from 'node:module'
import type { BrowserWindow } from 'electron'
import type { shell } from 'electron'
import { memoryManager } from '../../rina/index.js'
import { thinkingStream } from '../../rina/thinking/thinkingStream.js'
import { registerConsolidatedIpcHandlers } from './registerConsolidatedIpcHandlers.js'
import { registerLicenseIpc } from './registerLicenseIpc.js'
import { registerTelemetryIpc } from './registerTelemetryIpc.js'
import type { LicenseVerifyResponse } from '../../license.js'

const require = createRequire(import.meta.url)
const electron = require('electron')
const { ipcMain } = electron

// Daemon functions imported from main.ts context
// These need to be passed in since they depend on main.ts scope
// Using any to bypass strict type conflicts between main.ts and IPC handlers
let daemonFunctions: {
  daemonStatus: () => Promise<any>
  daemonTasks: (args?: any) => Promise<any>
  daemonTaskAdd: (args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }) => Promise<any>
  daemonStart: () => Promise<any>
  daemonStop: () => Promise<any>
  runAgent?: (prompt: string, opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }) => Promise<any>
  getStatus?: () => Promise<any>
  getMode?: () => Promise<any>
  setMode?: (mode: string) => Promise<any>
  getPlans?: () => Promise<any>
  getTools?: () => Promise<any>
  runsList?: (args?: { limit?: number }) => Promise<any>
  runsTail?: (args?: { runId?: string; sessionId?: string; maxLines?: number; maxBytes?: number }) => Promise<any>
  codeListFiles?: (args?: { projectRoot?: string; limit?: number }) => Promise<any>
  codeReadFile?: (args?: { projectRoot?: string; relativePath?: string; maxBytes?: number }) => Promise<any>
} | null = null

let licenseFunctions: {
  verifyLicense: (customerId: string) => Promise<LicenseVerifyResponse>
  applyVerifiedLicense: (data: LicenseVerifyResponse) => string
  resetLicenseToStarter: () => void
  saveEntitlements: () => void
  refreshLicenseState: () => Promise<{
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }>
  shell: Pick<typeof shell, 'openExternal'>
  getLicenseState: () => {
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }
  getCurrentLicenseCustomerId: () => string | null
  getDeviceId: () => string
  getCachedEmail: () => string | null
  setCachedEmail: (email: string) => void
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
  runAgent?: (prompt: string, opts?: { workspaceRoot?: string | null; mode?: 'auto' | 'assist' | 'explain' }) => Promise<any>
  getStatus?: () => Promise<any>
  getMode?: () => Promise<any>
  setMode?: (mode: string) => Promise<any>
  getPlans?: () => Promise<any>
  getTools?: () => Promise<any>
  runsList?: (args?: { limit?: number }) => Promise<any>
  runsTail?: (args?: { runId?: string; sessionId?: string; maxLines?: number; maxBytes?: number }) => Promise<any>
  codeListFiles?: (args?: { projectRoot?: string; limit?: number }) => Promise<any>
  codeReadFile?: (args?: { projectRoot?: string; relativePath?: string; maxBytes?: number }) => Promise<any>
}): void {
  daemonFunctions = daemon
}

export function setLicenseFunctions(license: {
  verifyLicense: (customerId: string) => Promise<LicenseVerifyResponse>
  applyVerifiedLicense: (data: LicenseVerifyResponse) => string
  resetLicenseToStarter: () => void
  saveEntitlements: () => void
  refreshLicenseState: () => Promise<{
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }>
  shell: Pick<typeof shell, 'openExternal'>
  getLicenseState: () => {
    tier: string
    has_token: boolean
    expires_at: number | null
    customer_id: string | null
    status: string
  }
  getCurrentLicenseCustomerId: () => string | null
  getDeviceId: () => string
  getCachedEmail: () => string | null
  setCachedEmail: (email: string) => void
}): void {
  licenseFunctions = license
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

  if (licenseFunctions) {
    registerLicenseIpc({
      ipcMain,
      ...licenseFunctions,
    })
  } else {
    console.warn('[IPC] License functions not set, using consolidated placeholder handlers')
  }

  registerTelemetryIpc()

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

  // Utility handlers
  // Note: utility:ping and utility:devtoolsToggle are already registered in registerConsolidatedIpcHandlers

  console.log('[IPC] IPC handler registration complete')
}
