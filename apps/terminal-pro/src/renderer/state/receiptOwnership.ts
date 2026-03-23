import type { WorkbenchStore } from '../workbench/store.js'
import type { ReceiptData } from '../workbench/types.js'
import type { FixBlockModel, RunModel } from '../workbench/store.js'

export function revealReceiptInWorkbench(store: WorkbenchStore, receipt: ReceiptData): void {
  store.dispatch({ type: 'receipt/set', receipt })
  store.dispatch({ type: 'ui/openDrawer', view: 'receipt' })
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
