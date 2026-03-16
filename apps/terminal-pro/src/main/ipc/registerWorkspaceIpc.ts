import type { IpcMain } from 'electron'

export function registerWorkspaceIpc(args: {
  ipcMain: IpcMain
  pickDirectory: () => Promise<string | null>
  pickWorkspace: () => Promise<{ ok: boolean; path?: string }>
  defaultWorkspace: (senderId: number) => Promise<{ ok: boolean; path: string }>
}) {
  const { ipcMain } = args

  ipcMain.handle('rina:pickDirectory', async () => args.pickDirectory())
  ipcMain.handle('rina:workspace:pick', async () => args.pickWorkspace())
  ipcMain.handle('rina:workspace:default', async (event) => args.defaultWorkspace(event.sender.id))
}
