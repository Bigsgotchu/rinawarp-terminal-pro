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
  // Track funnel step from renderer
  ipcMain.handle('analytics:trackFunnelStep', async (_event, step: string) => {
    const validSteps = ['signup', 'first_run', 'first_block', 'upgrade_view', 'paid']
    if (validSteps.includes(step)) {
      trackFunnelStep(step as any)
      return { success: true }
    }
    return { success: false, error: 'Invalid funnel step' }
  })

  // Track generic event from renderer
  ipcMain.handle('analytics:trackEvent', async (_event, event: string, properties?: Record<string, unknown>) => {
    trackEvent(event as any, properties)
    return { success: true }
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
    enableUsageTracking()
    return { success: true }
  })

  // Disable usage tracking
  ipcMain.handle('analytics:disableUsageTracking', async () => {
    disableUsageTracking()
    return { success: true }
  })

  // Track command executed (called from PTY)
  ipcMain.handle('analytics:trackCommandExecuted', async () => {
    trackCommandExecuted()
    return { success: true }
  })

  // Track AI suggestion used
  ipcMain.handle('analytics:trackAISuggestionUsed', async () => {
    trackAISuggestionUsed()
    return { success: true }
  })

  // Track self-healing run
  ipcMain.handle('analytics:trackSelfHealingRun', async () => {
    trackSelfHealingRun()
    return { success: true }
  })

  // Track terminal session start
  ipcMain.handle('analytics:trackTerminalSessionStart', async () => {
    trackTerminalSessionStart()
    return { success: true }
  })

  console.log('[IPC] Analytics handlers registered')
}
