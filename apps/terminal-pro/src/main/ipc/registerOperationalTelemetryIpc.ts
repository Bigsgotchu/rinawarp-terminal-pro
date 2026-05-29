import type { IpcMain } from 'electron'
import {
  getOperationalTelemetry,
  isOperationalTelemetryEvent,
  type OperationalTelemetrySendResult,
} from '../telemetry/operationalTelemetry.js'

function unavailable(): OperationalTelemetrySendResult {
  return {
    accepted: false,
    enabled: false,
    degraded: true,
    error: 'Operational telemetry is not initialized',
  }
}

export function registerOperationalTelemetryIpc(ipcMain: IpcMain): void {
  ipcMain.removeHandler('telemetry:privacy:get')
  ipcMain.handle('telemetry:privacy:get', async () => {
    const telemetry = getOperationalTelemetry()
    return telemetry?.getSettings() || null
  })

  ipcMain.removeHandler('telemetry:privacy:set')
  ipcMain.handle('telemetry:privacy:set', async (_event, input: { enabled?: unknown }) => {
    const telemetry = getOperationalTelemetry()
    if (!telemetry) return null
    return telemetry.setEnabled(input?.enabled === true)
  })

  ipcMain.removeHandler('telemetry:operational:record')
  ipcMain.handle('telemetry:operational:record', async (_event, event: string) => {
    const telemetry = getOperationalTelemetry()
    if (!telemetry) return unavailable()
    if (!isOperationalTelemetryEvent(event)) {
      return {
        accepted: false,
        enabled: telemetry.getSettings().enabled,
        degraded: true,
        error: 'Unsupported operational telemetry event',
      }
    }
    return telemetry.recordCounter(event)
  })
}
