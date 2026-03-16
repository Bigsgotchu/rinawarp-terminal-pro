import type { IpcMain } from 'electron'

export function registerHistoryIpc(args: { ipcMain: IpcMain; importHistory: (limit?: number) => Promise<unknown> }) {
  const { ipcMain } = args

  ipcMain.handle('rina:history:import', async (_event, limit?: number) => args.importHistory(limit))
}
