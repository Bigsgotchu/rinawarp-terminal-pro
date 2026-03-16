import { ipcMain } from 'electron'
import * as telemetry from '../telemetry'

/**
 * Telemetry IPC Handlers
 * 
 * These handlers bridge the renderer process to the telemetry module
 * which sends events to the telemetry WebSocket server.
 */

export function registerTelemetryIpc() {
  // Session tracking
  ipcMain.handle('telemetry:sessionStart', async () => {
    telemetry.trackSessionStart()
    return { ok: true }
  })

  ipcMain.handle('telemetry:sessionEnd', async () => {
    telemetry.trackSessionEnd()
    return { ok: true }
  })

  // Action tracking
  ipcMain.handle('telemetry:commandRun', async () => {
    telemetry.trackCommandRun()
    return { ok: true }
  })

  ipcMain.handle('telemetry:aiMessage', async () => {
    telemetry.trackAiMessage()
    return { ok: true }
  })

  ipcMain.handle('telemetry:quickFix', async () => {
    telemetry.trackQuickFix()
    return { ok: true }
  })
}
