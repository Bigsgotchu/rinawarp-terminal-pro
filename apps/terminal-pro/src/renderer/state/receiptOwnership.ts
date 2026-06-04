import type { WorkbenchStore } from '../workbench/store.js'
import type { ReceiptData } from '../workbench/types.js'
import type { FixBlockModel, RunModel } from '../workbench/store.js'
import type { ExecutionReceipt } from '../../workbench/runBlocks/types.js'
import {
  getReceiptCommands,
  getReceiptFileChanges,
  getReceiptRunId,
  getReceiptVerificationChecks,
} from '../../workbench/runBlocks/receiptCompat.js'

export function revealReceiptInWorkbench(store: WorkbenchStore, receipt: ReceiptData): void {
  store.dispatch({ type: 'receipt/set', receipt })
  store.dispatch({ type: 'ui/openDrawer', view: 'receipt' })
}

export function structuredReceiptFromExecutionReceipt(receipt: ExecutionReceipt, run?: RunModel | null): ReceiptData {
  const startedAt = new Date(receipt.startedAt).toISOString()
  const endedAt = new Date(receipt.completedAt).toISOString()
  const receiptRunId = getReceiptRunId(receipt)
  const commands = getReceiptCommands(receipt)
  const fileChanges = getReceiptFileChanges(receipt)
  const verificationLabels = getReceiptVerificationChecks(receipt).map((check) => check.label)
  const exitCode = commands.find((command) => typeof command.exitCode === 'number')?.exitCode ?? null
  const rolledBack = receipt.status === 'cancelled'
  return {
    kind: 'structured_command_receipt',
    id: receiptRunId,
    receiptId: receiptRunId,
    sessionId: run?.sessionId || receiptRunId,
    session: {
      id: run?.sessionId || receiptRunId,
      updatedAt: endedAt,
      projectRoot: run?.projectRoot || run?.cwd || null,
      source: run?.source || 'renderer-execution-receipt',
      platform: navigator.platform || 'unknown',
    },
    command: {
      input: commands[0]?.command || run?.command || run?.title || 'Unknown command',
      cwd: run?.cwd || run?.projectRoot || null,
      startedAt,
      endedAt,
      exitCode,
      ok: receipt.status === 'succeeded' && receipt.verification.status === 'passed',
      cancelled: false,
      error: receipt.status === 'succeeded' ? null : verificationLabels.join('\n') || null,
    },
    artifacts: {
      stdoutChunks: 0,
      stderrChunks: 0,
      metaChunks: verificationLabels.length,
      stdoutPreview: '',
      stderrPreview: '',
      metaPreview: verificationLabels.join('\n'),
      changedFiles: fileChanges.map((change) => change.path),
      diffHints: rolledBack ? ['rollback occurred'] : [],
      urls: [],
    },
  } as ReceiptData
}

export function revealExecutionReceiptInWorkbench(store: WorkbenchStore, receipt: ExecutionReceipt): void {
  const receiptRunId = getReceiptRunId(receipt)
  const run = store.getState().runs.find((entry) => entry.id === receiptRunId || entry.latestReceiptId === receiptRunId)
  revealReceiptInWorkbench(store, structuredReceiptFromExecutionReceipt(receipt, run))
}

export function receiptReferenceForRun(run: Pick<RunModel, 'latestReceiptId' | 'sessionId' | 'id'> | null | undefined): string | null {
  if (!run) return null
  return String(run.latestReceiptId || run.sessionId || run.id || '').trim() || null
}

export function receiptReferenceForFix(
  store: WorkbenchStore,
  fix: Pick<FixBlockModel, 'runId' | 'applyRunId'> | null | undefined
): string | null {
  if (!fix) return null
  const candidateRunIds = [fix.applyRunId, fix.runId].filter((value): value is string => Boolean(String(value || '').trim()))
  for (const runId of candidateRunIds) {
    const run = store.getState().runs.find((entry) => entry.id === runId)
    const receiptId = receiptReferenceForRun(run)
    if (receiptId) return receiptId
  }
  return candidateRunIds[0] || null
}
