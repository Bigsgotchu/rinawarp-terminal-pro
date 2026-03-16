import type { IpcMain } from 'electron'

type ExportPreviewKind = 'runbook_markdown' | 'audit_json'

export function registerExportIpc(args: {
  ipcMain: IpcMain
  preview: (payload: { kind: ExportPreviewKind; sessionId?: string }) => Promise<unknown>
  publish: (payload: { previewId?: string; typedConfirm?: string; expectedHash?: string }) => Promise<unknown>
  auditExport: () => Promise<unknown>
}) {
  const { ipcMain } = args

  ipcMain.handle('rina:export:preview', async (_event, payload: { kind: ExportPreviewKind; sessionId?: string }) =>
    args.preview(payload)
  )
  ipcMain.handle(
    'rina:export:publish',
    async (_event, payload: { previewId?: string; typedConfirm?: string; expectedHash?: string }) =>
      args.publish(payload)
  )
  ipcMain.handle('rina:audit:export', async () => args.auditExport())
}
