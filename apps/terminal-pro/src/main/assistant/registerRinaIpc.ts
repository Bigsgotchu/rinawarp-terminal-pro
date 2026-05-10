import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import {
  clearStoredRinaAuthToken,
  getRinaCloudAccountStatus,
  saveStoredRinaAuthToken,
} from '../rina-cloud-account.js'

type DiagnosticsBundleDeps = unknown

type RegisterRinaIpcDeps = {
  ipcMain: IpcMain
  openRunsFolderForIpc: () => Promise<unknown> | unknown
  revealRunReceiptForIpc: (receiptId: unknown) => Promise<unknown> | unknown
  fixProjectForIpc: (projectRoot: unknown) => Promise<unknown> | unknown
  explainPolicy: (command: string) => Promise<unknown> | unknown
  redactionPreviewForIpc: (text: unknown) => Promise<unknown> | unknown
  diagnosticsPathsForIpc: (deps: DiagnosticsBundleDeps) => Promise<unknown> | unknown
  diagnosticsBundleDeps: DiagnosticsBundleDeps
  supportBundleForIpcWithSnapshot: (
    deps: DiagnosticsBundleDeps,
    snapshot: unknown,
  ) => Promise<unknown> | unknown
  workspacePickForIpc: () => Promise<unknown> | unknown
  workspaceDefaultForIpc: (senderId: number) => Promise<unknown> | unknown
  workspaceDemoForIpc: () => Promise<unknown> | unknown
}

type IpcHandler = Parameters<IpcMain['handle']>[1]

function replaceHandler(
  ipcMain: IpcMain,
  channel: string,
  handler: IpcHandler,
): void {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

export function registerRinaIpc(deps: RegisterRinaIpcDeps): void {
  const {
    ipcMain,
    openRunsFolderForIpc,
    revealRunReceiptForIpc,
    fixProjectForIpc,
    explainPolicy,
    redactionPreviewForIpc,
    diagnosticsPathsForIpc,
    diagnosticsBundleDeps,
    supportBundleForIpcWithSnapshot,
    workspacePickForIpc,
    workspaceDefaultForIpc,
    workspaceDemoForIpc,
  } = deps

  replaceHandler(ipcMain, 'rina:openRunsFolder', async () => openRunsFolderForIpc())

  replaceHandler(ipcMain, 'rina:revealRunReceipt', async (_event: IpcMainInvokeEvent, receiptId: unknown) =>
    revealRunReceiptForIpc(receiptId),
  )

  replaceHandler(ipcMain, 'rina:fixProject', async (_event: IpcMainInvokeEvent, projectRoot: unknown) =>
    fixProjectForIpc(projectRoot),
  )

  replaceHandler(ipcMain, 'rina:policy:explain', async (_event: IpcMainInvokeEvent, command: unknown) =>
    explainPolicy(String(command || '')),
  )

  replaceHandler(ipcMain, 'rina:redaction:preview', async (_event: IpcMainInvokeEvent, text: unknown) =>
    redactionPreviewForIpc(text),
  )

  replaceHandler(ipcMain, 'rina:diagnostics:paths', async () =>
    diagnosticsPathsForIpc(diagnosticsBundleDeps),
  )

  replaceHandler(ipcMain, 'rina:support:bundle', async (_event: IpcMainInvokeEvent, snapshot: unknown) =>
    supportBundleForIpcWithSnapshot(diagnosticsBundleDeps, snapshot),
  )

  replaceHandler(ipcMain, 'rina:workspace:pick', async () => workspacePickForIpc())

  replaceHandler(ipcMain, 'rina:workspace:demo', async () => workspaceDemoForIpc())

  replaceHandler(ipcMain, 'rina:workspace:default', async (event: IpcMainInvokeEvent) =>
    workspaceDefaultForIpc(event.sender.id),
  )

  replaceHandler(ipcMain, 'rina:cloud:account', async () => getRinaCloudAccountStatus())

  replaceHandler(ipcMain, 'rina:cloud:auth:save', async (_event: IpcMainInvokeEvent, payload: unknown) => {
    const token = String((payload as { token?: string } | null)?.token || '').trim()
    if (!token) return { ok: false, error: 'Missing Rina Cloud auth token.' }
    await saveStoredRinaAuthToken(token)
    return getRinaCloudAccountStatus()
  })

  replaceHandler(ipcMain, 'rina:cloud:auth:clear', async () => {
    await clearStoredRinaAuthToken()
    return getRinaCloudAccountStatus()
  })
}
