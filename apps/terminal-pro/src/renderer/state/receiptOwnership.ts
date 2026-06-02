import type { WorkbenchStore } from '../workbench/store.js'
import type { ReceiptData } from '../workbench/types.js'
import type { FixBlockModel, RunModel } from '../workbench/store.js'
import type { ExecutionReceipt } from '../../workbench/runBlocks/types.js'

export function revealReceiptInWorkbench(store: WorkbenchStore, receipt: ReceiptData): void {
  store.dispatch({ type: 'receipt/set', receipt })
  store.dispatch({ type: 'ui/openDrawer', view: 'receipt' })
}

export function structuredReceiptFromExecutionReceipt(receipt: ExecutionReceipt, run?: RunModel | null): ReceiptData {
  const startedAt = new Date(receipt.startedAt).toISOString()
  const endedAt = new Date(receipt.completedAt).toISOString()
  return {
    kind: 'structured_command_receipt',
    id: receipt.runId,
    receiptId: receipt.runId,
    sessionId: run?.sessionId || receipt.transactionId || receipt.runId,
    session: {
      id: run?.sessionId || receipt.transactionId || receipt.runId,
      updatedAt: endedAt,
      projectRoot: run?.projectRoot || run?.cwd || null,
      source: run?.source || 'renderer-execution-receipt',
      platform: navigator.platform || 'unknown',
    },
    command: {
      input: receipt.commandsExecuted[0] || run?.command || run?.title || 'Unknown command',
      cwd: run?.cwd || run?.projectRoot || null,
      startedAt,
      endedAt,
      exitCode: receipt.exitCode,
      ok: receipt.exitCode === 0 && !receipt.rollbackOccurred,
      cancelled: false,
      error: receipt.exitCode === 0 ? null : receipt.verificationResults.join('\n') || null,
    },
    artifacts: {
      stdoutChunks: 0,
      stderrChunks: 0,
      metaChunks: receipt.actionsPerformed.length,
      stdoutPreview: '',
      stderrPreview: '',
      metaPreview: receipt.verificationResults.join('\n'),
      changedFiles: receipt.filesChanged,
      diffHints: receipt.rollbackOccurred ? ['rollback occurred'] : [],
      urls: [],
    },
  } as ReceiptData
}

export function revealExecutionReceiptInWorkbench(store: WorkbenchStore, receipt: ExecutionReceipt): void {
  const run = store.getState().runs.find((entry) => entry.id === receipt.runId || entry.latestReceiptId === receipt.runId)
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
