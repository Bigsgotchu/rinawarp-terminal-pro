import type { WorkbenchStore } from '../workbench/store.js'
import { loadExecutionReceipt } from '../../workbench/runBlocks/receiptPersistence.js'

/** Restore execution context for a receipt-backed run (logs, cognition, receipt inspector). */
export function replayRunFromReceipt(store: WorkbenchStore, runId: string): boolean {
  const state = store.getState()
  const receipt = state.executionReceiptsByRunId[runId] || loadExecutionReceipt(runId)
  const runBlock = state.runBlocksById[runId]
  const run = state.runs.find((entry) => entry.id === runId)

  if (!receipt && !runBlock && !run) {
    store.dispatch({ type: 'ui/setStatusSummary', text: 'No receipt found for this run.' })
    return false
  }

  const tail = state.runOutputTailByRunId[runId] || ''
  if (run || tail) {
    store.dispatch({
      type: 'executionTrace/blockUpsert',
      block: {
        id: `replay:${runId}`,
        cmd: run?.command || receipt?.commandsExecuted[0],
        status:
          receipt?.rollbackOccurred || run?.status === 'failed'
            ? 'failed'
            : run?.status === 'ok' || receipt?.exitCode === 0
              ? 'success'
              : 'info',
        runId,
        exitCode: run?.exitCode ?? receipt?.exitCode ?? null,
        output: tail || runBlock?.summary || receipt?.verificationResults.join('\n') || '',
        ts: Date.now(),
      },
    })
  }

  store.dispatch({ type: 'ui/toggleRunOutput', runId })
  if (!state.ui.expandedRunOutputByRunId[runId]) {
    store.dispatch({ type: 'ui/toggleRunOutput', runId })
  }

  store.dispatch({ type: 'view/centerSet', view: 'execution-trace' })
  store.dispatch({ type: 'ui/openDrawer', view: 'execution-trace' })
  store.dispatch({
    type: 'ui/setStatusSummary',
    text: receipt
      ? `Replaying run ${runId} · exit ${receipt.exitCode}${receipt.rollbackOccurred ? ' · rolled back' : ''}`
      : `Replaying run ${runId}`,
  })
  return true
}

export function copyReceiptSummary(store: WorkbenchStore, runId: string): string | null {
  const receipt = store.getState().executionReceiptsByRunId[runId] || loadExecutionReceipt(runId)
  if (!receipt) return null

  const durationSec = Math.max(1, Math.round((receipt.completedAt - receipt.startedAt) / 1000))
  return [
    `Run ${receipt.runId}`,
    `Exit code: ${receipt.exitCode}`,
    `Duration: ${durationSec}s`,
    `Rollback: ${receipt.rollbackOccurred ? 'yes' : 'no'}`,
    `Commands: ${receipt.commandsExecuted.join(' · ') || 'n/a'}`,
    `Files changed: ${receipt.filesChanged.join(', ') || 'none'}`,
    `Verification: ${receipt.verificationResults.join(' · ') || 'n/a'}`,
  ].join('\n')
}
