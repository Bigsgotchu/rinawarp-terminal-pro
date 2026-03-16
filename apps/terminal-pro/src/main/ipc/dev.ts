import type { IpcMain, WebContents } from 'electron'
import type { AppContext } from '../context.js'
import { trackFunnelStep, trackEvent } from '../../analytics.js'

export function registerDevIpc(args: {
  ipcMain: IpcMain
  ctx: AppContext
  mainPath: string
  repoRoot: string
  appProjectRoot: string
  dirname: string
  readTailLines: (filePath: string, maxLines: number) => string
  rendererErrorsFile: () => string
  getSessionTranscript: () => unknown
  exportTranscript: (format: 'json' | 'text') => string
  currentPolicyEnv: () => string
  zipFiles: (files: Array<{ name: string; data: Buffer }>) => Buffer
  showSaveDialogForBundle: (defaultPath: string) => Promise<{ canceled: boolean; filePath?: string }>
  operationalMemory: {
    getRecent: (category: string) => any[]
    set: (category: string, key: string, value: string) => void
  }
  addTranscriptEntry: (entry: {
    type: 'memory'
    timestamp: string
    category: string
    key: string
    value: string
  }) => void
  devtoolsToggle: (sender: WebContents) => Promise<unknown>
  ping: () => Promise<unknown>
  diagnoseHot: () => Promise<unknown>
  plan: (intent: string) => Promise<unknown>
  playbooksGet: () => Promise<unknown>
  playbookExecute: (playbookId: string, fixIndex: number) => Promise<unknown>
  redactionPreview: (text: string) => Promise<unknown>
}) {
  const { ipcMain } = args

  // Remove existing handlers to prevent duplicates during hot reload
  ipcMain.removeHandler('rina:diagnostics:readTailLines')
  ipcMain.removeHandler('rina:diagnostics:rendererErrors')
  ipcMain.removeHandler('rina:diagnostics:sessionTranscript')
  ipcMain.removeHandler('rina:diagnostics:exportTranscript')
  ipcMain.removeHandler('rina:diagnostics:zipFiles')
  ipcMain.removeHandler('rina:diagnostics:showSaveDialog')
  ipcMain.removeHandler('rina:devtools:toggle')
  ipcMain.removeHandler('rina:ping')
  ipcMain.removeHandler('rina:diagnoseHot')
  ipcMain.removeHandler('rina:plan')
  ipcMain.removeHandler('rina:playbooks:get')
  ipcMain.removeHandler('rina:playbook:execute')
  ipcMain.removeHandler('rina:redaction:preview')

  ipcMain.handle('rina:diagnostics:readTailLines', async (_event, filePath: string, maxLines: number) =>
    args.readTailLines(filePath, maxLines)
  )

  ipcMain.handle('rina:diagnostics:rendererErrors', async () => args.rendererErrorsFile())

  ipcMain.handle('rina:diagnostics:sessionTranscript', async () => args.getSessionTranscript())

  ipcMain.handle('rina:diagnostics:exportTranscript', async (_event, format: 'json' | 'text') =>
    args.exportTranscript(format)
  )

  ipcMain.handle('rina:diagnostics:zipFiles', async (_event, files: Array<{ name: string; data: Buffer }>) =>
    args.zipFiles(files)
  )

  ipcMain.handle('rina:diagnostics:showSaveDialog', async (_event, defaultPath: string) =>
    args.showSaveDialogForBundle(defaultPath)
  )

  ipcMain.handle('rina:devtools:toggle', async (event) => args.devtoolsToggle(event.sender))

  ipcMain.handle('rina:ping', async () => args.ping())

  ipcMain.handle('rina:diagnoseHot', async () => args.diagnoseHot())

  ipcMain.handle('rina:plan', async (_event, intent: string) => args.plan(intent))

  ipcMain.handle('rina:playbooks:get', async () => args.playbooksGet())

  ipcMain.handle('rina:playbook:execute', async (_event, playbookId: string, fixIndex: number) =>
    args.playbookExecute(playbookId, fixIndex)
  )

  ipcMain.handle('rina:redaction:preview', async (_event, text: string) => args.redactionPreview(text))
}
