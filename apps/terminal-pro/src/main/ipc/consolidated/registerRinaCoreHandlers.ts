import { rinaController } from '../../../rina/rina-controller.js'
import type { ConsolidatedIpcArgs, RinaStatus, ShellKind } from './types.js'

export function registerRinaCoreHandlers({ ipcMain }: ConsolidatedIpcArgs): void {
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
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        degraded: true,
      }
    }
  })

  ipcMain.handle('rina:getProgress', async () => {
    try {
      return rinaController.getAgentProgress()
    } catch (error) {
      console.error('[IPC] rina:getProgress error:', error)
      return {
        current: 0,
        total: 0,
        percentage: 0,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        degraded: true,
      }
    }
  })

  ipcMain.handle('rina:subscribeEvents', async () => {
    try {
      rinaController.onAgentEvent((event) => {
        console.log('[IPC] rina:event:', event.type)
      })
      return { ok: true, unsubscribe: true }
    } catch (error) {
      console.error('[IPC] rina:subscribeEvents error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('rina:getMemoryStats', async () => {
    try {
      return rinaController.getStats()
    } catch (error) {
      console.error('[IPC] rina:getMemoryStats error:', error)
      return {
        conversation: { entries: 0 },
        longterm: { sessions: 0, projects: 0 },
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        degraded: true,
      }
    }
  })

  ipcMain.handle('rina:clearSession', async () => {
    try {
      rinaController.clearSession()
      return { ok: true }
    } catch (error) {
      console.error('[IPC] rina:clearSession error:', error)
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('shell:getKind', (_event, shell?: string): ShellKind => {
    if (!shell) return 'unknown'
    const value = shell.toLowerCase()
    if (value.includes('pwsh') || value.includes('powershell')) return 'pwsh'
    if (value.includes('fish')) return 'fish'
    if (value.includes('zsh')) return 'zsh'
    if (value.includes('bash')) return 'bash'
    return 'unknown'
  })
}
