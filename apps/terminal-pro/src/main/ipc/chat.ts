import type { IpcMain } from 'electron'

export function registerChatIpc(args: {
  ipcMain: IpcMain
  sendChat: (text: string, projectRoot?: string) => Promise<unknown>
  exportChatTranscript: () => Promise<string>
}) {
  const { ipcMain } = args

  // Remove existing handlers to prevent duplicates during hot reload
  ipcMain.removeHandler('rina:chat:send')
  ipcMain.removeHandler('rina:chat:export')

  ipcMain.handle('rina:chat:send', async (_event, text: string, projectRoot?: string) =>
    args.sendChat(text, projectRoot)
  )
  ipcMain.handle('rina:chat:export', async () => args.exportChatTranscript())
}
