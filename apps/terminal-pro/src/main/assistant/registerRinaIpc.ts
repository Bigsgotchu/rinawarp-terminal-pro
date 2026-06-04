import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import type { WebContents } from 'electron'
import type { RinaExecutionRecord } from '@rinawarp/rina-core'
import { assertRinaExecutionResult } from '@rinawarp/rina-runtime/execution/executionRecord'
import type { RuntimeIngressRequest } from '@rinawarp/rina-runtime/ipc'
import { RinaEventStream, RinaMemoryStore } from '@rinawarp/rina-runtime'
import {
  clearStoredRinaAuthToken,
  createRinaCloudCheckoutSession,
  createRinaCloudPortalSession,
  getRinaCloudAccountStatus,
  saveStoredRinaAuthToken,
} from '../rina-cloud-account.js'
import type { RinaAgentRequest } from '../rina-agent.js'
import {
  parseRinaIntent,
  submitApprovedPatchIntent,
  submitRinaIntent,
  submitUiPrompt,
} from './rinaIntentLoop.js'
import { getOperationalTelemetry } from '../telemetry/operationalTelemetry.js'
import { resolveSharedWorkspaceCwd } from '../runtime/runtimeAccess.js'

type DiagnosticsBundleDeps = unknown

type RegisterRinaIpcDeps = {
  ipcMain: IpcMain
  shell?: { openExternal(url: string): Promise<void> }
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

type AgentRunRequest = {
  prompt?: unknown
  projectRoot?: unknown
}

type AgentIntentRequest = Partial<RuntimeIngressRequest>

type AgentPatchApprovalRequest = {
  request?: RinaAgentRequest
  payload?: unknown
}

function replaceHandler(
  ipcMain: IpcMain,
  channel: string,
  handler: IpcHandler,
): void {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

function deniedExecutionRecord(intentId: string, explanation: string): RinaExecutionRecord {
  const record: RinaExecutionRecord = {
    runId: intentId,
    requestId: intentId,
    intent: {
      id: intentId,
      source: 'system',
      kind: 'analyze',
      target: 'ingress.invalid',
      createdAt: Date.now(),
    },
    transactions: [],
    events: [],
    receipts: [{ runId: intentId, artifacts: [intentId], summary: explanation }],
    outcome: { explanation, risk: 'medium' },
  }
  assertRinaExecutionResult(record)
  return record
}

export function registerRinaIpc(deps: RegisterRinaIpcDeps): void {
  const {
    ipcMain,
    shell,
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

  let rendererWebContents: WebContents | null = null
  const memory = new RinaMemoryStore()
  const stream = new RinaEventStream()

  stream.subscribe((event) => {
    if (!rendererWebContents || rendererWebContents.isDestroyed()) return
    rendererWebContents.send('rina:stream', event)
  })

  replaceHandler(ipcMain, 'rina:openRunsFolder', async () => openRunsFolderForIpc())

  replaceHandler(ipcMain, 'rina:revealRunReceipt', async (_event: IpcMainInvokeEvent, receiptId: unknown) =>
    revealRunReceiptForIpc(receiptId),
  )

  replaceHandler(ipcMain, 'rina:fixProject', async (_event: IpcMainInvokeEvent, projectRoot: unknown) =>
    fixProjectForIpc(projectRoot),
  )

  replaceHandler(ipcMain, 'rina:agent:run', async (_event: IpcMainInvokeEvent, args: AgentRunRequest | undefined) => {
    const projectRoot = resolveSharedWorkspaceCwd(typeof args?.projectRoot === 'string' ? args.projectRoot : undefined)
    const prompt = String(args?.prompt || '').trim()
    const record = await submitUiPrompt(prompt, projectRoot, undefined, { memory, stream })
    assertRinaExecutionResult(record)
    return record
  })

  replaceHandler(ipcMain, 'rina:ingress', async (event: IpcMainInvokeEvent, args: AgentIntentRequest | undefined) => {
    rendererWebContents = event.sender
    if (args?.type !== 'intent.submit') {
      return deniedExecutionRecord(`invalid:${Date.now()}`, 'The runtime ingress request type was invalid, so no work was started.')
    }
    const intent = parseRinaIntent(args?.intent)
    if (!intent) {
      return deniedExecutionRecord(`invalid:${Date.now()}`, 'The intent payload was invalid, so no runtime work was started.')
    }
    const contextProjectRoot = args.context?.projectRoot
    const record = await submitRinaIntent(intent, resolveSharedWorkspaceCwd(typeof contextProjectRoot === 'string' ? contextProjectRoot : undefined), args.context, {
      memory,
      stream,
    })
    assertRinaExecutionResult(record)
    return record
  })

  replaceHandler(
    ipcMain,
    'rina:agent:approvePatch',
    async (_event: IpcMainInvokeEvent, args: AgentPatchApprovalRequest | undefined) => {
      if (!args?.request || !args?.payload) {
        return deniedExecutionRecord(
          `invalid:${Date.now()}`,
          'The patch approval payload was incomplete, so I did not change anything.',
        )
      }
      const record = await submitApprovedPatchIntent(args.request, args.payload, { memory, stream })
      assertRinaExecutionResult(record)
      void getOperationalTelemetry()?.recordCounter('safe_fix_approved')
      return record
    },
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

  replaceHandler(ipcMain, 'rina:support:bundle', async (_event: IpcMainInvokeEvent, snapshot: unknown) => {
    const result = await supportBundleForIpcWithSnapshot(diagnosticsBundleDeps, snapshot)
    if ((result as { ok?: boolean } | null)?.ok) {
      void getOperationalTelemetry()?.recordCounter('crash_report_created')
    }
    return result
  })

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

  replaceHandler(ipcMain, 'rina:cloud:checkout', async (_event: IpcMainInvokeEvent, payload: unknown) => {
    try {
      const email = String((payload as { email?: string } | null)?.email || '').trim().toLowerCase()
      const session = await createRinaCloudCheckoutSession({ email })
      if (!session?.url) return { ok: false, error: 'No Stripe checkout URL returned.' }
      await shell?.openExternal(session.url)
      return { ok: true, url: session.url, sessionId: session.sessionId }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not open Stripe checkout.' }
    }
  })

  replaceHandler(ipcMain, 'rina:cloud:portal', async () => {
    try {
      const session = await createRinaCloudPortalSession()
      if (!session?.url) return { ok: false, error: 'No Stripe portal URL returned.' }
      await shell?.openExternal(session.url)
      return { ok: true, url: session.url }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Could not open Stripe billing portal.' }
    }
  })
}
