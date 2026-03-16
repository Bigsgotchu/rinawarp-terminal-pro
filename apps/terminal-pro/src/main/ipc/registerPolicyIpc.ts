import type { IpcMain } from 'electron'
import type { AppContext } from '../context.js'

export function registerPolicyIpc(args: {
  ipcMain: IpcMain
  ctx: AppContext
  currentPolicyEnv: () => string
  getCurrentRole: () => string
  explainPolicy: (command: string) => {
    env: string
    action: string
    approval: string
    message: string
    typedPhrase?: string
    matchedRuleId?: string
  }
}) {
  args.ipcMain.handle('rina:policy:env', async () => {
    return { env: args.currentPolicyEnv(), role: args.getCurrentRole() }
  })

  args.ipcMain.handle('rina:policy:explain', async (_event, command: string) => {
    return args.explainPolicy(String(command || ''))
  })
}
