/**
 * IPC Handlers for Analytics
 *
 * Exposes analytics functions to the renderer process.
 */

import * as electron from 'electron'
const { ipcMain } = electron
import {
  trackFunnelStep,
  trackEvent,
  getUsageStatus,
  isUsageTrackingEnabled,
  enableUsageTracking,
  disableUsageTracking,
  trackCommandExecuted,
  trackAISuggestionUsed,
  trackSelfHealingRun,
  trackTerminalSessionStart,
} from '../../analytics.js'

export function registerAnalyticsIpc(): void {
  function toIpcResult(
    result:
      | { accepted: boolean; enabled: boolean; degraded?: boolean; error?: string }
      | undefined,
    event: string
  ) {
    return {
      ok: Boolean(result?.accepted),
      accepted: Boolean(result?.accepted),
      enabled: Boolean(result?.enabled),
      degraded: Boolean(result?.degraded),
      event,
      error: result?.error,
    }
  }

  // Track funnel step from renderer
  ipcMain.handle('analytics:trackFunnelStep', async (_event, step: string) => {
    const validSteps = ['signup', 'first_run', 'first_block', 'upgrade_view', 'paid']
    if (validSteps.includes(step)) {
      return toIpcResult(trackFunnelStep(step as any), `funnel:${step}`)
    }
    return {
      ok: false,
      accepted: false,
      enabled: true,
      degraded: false,
      event: `funnel:${step}`,
      error: 'Invalid funnel step',
    }
  })

  // Track generic event from renderer
  ipcMain.handle('analytics:trackEvent', async (_event, event: string, properties?: Record<string, unknown>) => {
    return toIpcResult(trackEvent(event as any, properties), event)
  })

  // Get usage status (for license panel)
  ipcMain.handle('analytics:getUsageStatus', async () => {
    return getUsageStatus()
  })

  // Check if usage tracking is enabled
  ipcMain.handle('analytics:isUsageTrackingEnabled', async () => {
    return isUsageTrackingEnabled()
  })

  // Enable usage tracking (opt-in)
  ipcMain.handle('analytics:enableUsageTracking', async () => {
    return toIpcResult(enableUsageTracking(), 'usage_tracking_enabled')
  })

  // Disable usage tracking
  ipcMain.handle('analytics:disableUsageTracking', async () => {
    disableUsageTracking()
    return {
      ok: true,
      accepted: true,
      enabled: false,
      degraded: false,
      event: 'usage_tracking_disabled',
    }
  })

  // Track command executed (called from PTY)
  ipcMain.handle('analytics:trackCommandExecuted', async () => {
    return toIpcResult(trackCommandExecuted(), 'command_executed')
  })

  // Track AI suggestion used
  ipcMain.handle('analytics:trackAISuggestionUsed', async () => {
    return toIpcResult(trackAISuggestionUsed(), 'ai_suggestion_used')
  })

  // Track self-healing run
  ipcMain.handle('analytics:trackSelfHealingRun', async () => {
    return toIpcResult(trackSelfHealingRun(), 'self_healing_run')
  })

  // Track terminal session start
  ipcMain.handle('analytics:trackTerminalSessionStart', async () => {
    return toIpcResult(trackTerminalSessionStart(), 'terminal_session_tracked')
  })

  console.log('[IPC] Analytics handlers registered')
}
