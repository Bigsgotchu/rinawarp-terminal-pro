import type { WorkbenchStore } from '../workbench/store.js'
import { loadExecutionReceipt } from '../../workbench/runBlocks/receiptPersistence.js'
import {
  getReceiptCommands,
  getReceiptFileChanges,
  getReceiptRunId,
  getReceiptVerificationChecks,
} from '../../workbench/runBlocks/receiptCompat.js'

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
      const commands = getReceiptCommands(receipt || undefined)
      const verificationLabels = getReceiptVerificationChecks(receipt || undefined).map((check) => check.label)
      store.dispatch({
        type: 'executionTrace/blockUpsert',
        block: {
          id: `replay:${runId}`,
          cmd: run?.command || commands[0]?.command,
          status:
            receipt?.status === 'cancelled' || run?.status === 'failed'
              ? 'failed'
              : run?.status === 'ok' || receipt?.status === 'succeeded'
                ? 'success'
                : 'info',
          runId,
          exitCode: run?.exitCode ?? commands.find((command) => typeof command.exitCode === 'number')?.exitCode ?? null,
          output: tail || runBlock?.summary || (Array.isArray(verificationLabels) ? verificationLabels.join('\n') : '') || '',
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
      ? `Replaying run ${runId} · ${receipt.status}${receipt.status === 'cancelled' ? ' · rolled back' : ''}`
      : `Replaying run ${runId}`,
  })
  return true
}

export function copyReceiptSummary(store: WorkbenchStore, runId: string): string | null {
  const receipt = store.getState().executionReceiptsByRunId[runId] || loadExecutionReceipt(runId)
  if (!receipt) return null

  const commands = getReceiptCommands(receipt)
  const fileChanges = getReceiptFileChanges(receipt)
  const receiptRunId = getReceiptRunId(receipt)
  const verificationLabels = getReceiptVerificationChecks(receipt).map((check) => check.label)
  const durationSec = Math.max(1, Math.round((Date.parse(receipt.completedAt) - Date.parse(receipt.startedAt)) / 1000))
  return [
    `Run ${receiptRunId}`,
    `Exit code: ${commands.find((command) => typeof command.exitCode === 'number')?.exitCode ?? 'n/a'}`,
    `Duration: ${durationSec}s`,
    `Rollback: ${receipt.status === 'cancelled' ? 'yes' : 'no'}`,
    `Commands: ${commands.map((command) => command.command).join(' · ') || 'n/a'}`,
    `Files changed: ${fileChanges.map((change) => change.path).join(', ') || 'none'}`,
    `Verification: ${(Array.isArray(verificationLabels) ? verificationLabels.join(' · ') : '') || 'n/a'}`,
  ].join('\n')
}
