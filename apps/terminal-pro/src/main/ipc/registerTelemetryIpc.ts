import { createRequire } from 'node:module'
import * as telemetry from '../telemetry.js'

const require = createRequire(import.meta.url)
const electron = require('electron')
const { ipcMain } = electron

/**
 * Telemetry IPC Handlers
 * 
 * These handlers bridge the renderer process to the telemetry module
 * which sends events to the telemetry WebSocket server.
 */

export function registerTelemetryIpc() {
  function toIpcResult(result: telemetry.TelemetryDispatchResult, event: string) {
    return {
      ok: result.accepted,
      accepted: result.accepted,
      connected: result.connected,
      degraded: Boolean(result.degraded),
      event,
      error: result.error,
    }
  }

  // Session tracking
  ipcMain.handle('telemetry:sessionStart', async () => {
    return toIpcResult(telemetry.trackSessionStart(), 'session:start')
  })

  ipcMain.handle('telemetry:sessionEnd', async () => {
    return toIpcResult(telemetry.trackSessionEnd(), 'session:end')
  })

  // Action tracking
  ipcMain.handle('telemetry:commandRun', async () => {
    return toIpcResult(telemetry.trackCommandRun(), 'command:run')
  })

  ipcMain.handle('telemetry:aiMessage', async () => {
    return toIpcResult(telemetry.trackAiMessage(), 'ai:message')
  })

  ipcMain.handle('telemetry:quickFix', async () => {
    return toIpcResult(telemetry.trackQuickFix(), 'quickfix:apply')
  })
}
