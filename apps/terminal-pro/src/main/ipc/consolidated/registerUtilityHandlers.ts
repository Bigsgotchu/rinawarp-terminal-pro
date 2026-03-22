import type { ConsolidatedIpcArgs } from './types.js'

export function registerUtilityHandlers({ ipcMain }: ConsolidatedIpcArgs): void {
  ipcMain.handle('utility:ping', async () => {
    return { pong: true, timestamp: new Date().toISOString() }
  })

  ipcMain.handle('utility:devtoolsToggle', async () => {
    return { ok: true, opened: false }
  })
}
