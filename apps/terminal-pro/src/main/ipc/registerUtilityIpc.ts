import type { IpcMain, WebContents } from 'electron'
import { trackQuickFix } from '../telemetry.js'

export function registerUtilityIpc(args: {
  ipcMain: IpcMain
  devtoolsToggle: (sender: WebContents) => Promise<unknown>
  ping: () => Promise<unknown>
  diagnoseHot: () => Promise<unknown>
  plan: (intent: string) => Promise<unknown>
  playbooksGet: () => Promise<unknown>
  playbookExecute: (playbookId: string, fixIndex: number) => Promise<unknown>
  redactionPreview: (text: string) => Promise<unknown>
}) {
  const { ipcMain } = args

  ipcMain.handle('rina:devtools:toggle', async (event) => args.devtoolsToggle(event.sender))
  ipcMain.handle('rina:ping', async () => args.ping())
  ipcMain.handle('rina:diagnoseHot', async () => args.diagnoseHot())
  ipcMain.handle('rina:plan', async (_event, intent: string) => args.plan(intent))
  ipcMain.handle('rina:playbooks:get', async () => args.playbooksGet())
  ipcMain.handle('rina:playbook:execute', async (_event, playbookId: string, fixIndex: number) => {
    // Track quick fix for telemetry
    trackQuickFix()
    return args.playbookExecute(playbookId, fixIndex)
  })
  ipcMain.handle('rina:redaction:preview', async (_event, text: string) => args.redactionPreview(text))
}
