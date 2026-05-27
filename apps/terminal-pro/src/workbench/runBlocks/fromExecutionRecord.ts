import type { RinaExecutionEvent, RinaExecutionRecord } from '@rinawarp/rina-core'
import { cognitionLabelForIngressEvent } from './cognitionStream.js'
import type { DiffSummary, ExecutionReceipt, RunBlock, RunBlockStatus, RuntimeTimelineEvent } from './types.js'

function mapStatus(record: RinaExecutionRecord): RunBlockStatus {
  const rolledBack =
    record.events.some((event) => event.type === 'transaction.rolled_back') ||
    record.outcome?.transactionOutcome === 'rolled_back'
  if (rolledBack) return 'rolled_back'

  const failed = record.events.some((event) => event.type === 'execution.failed')
  const completed = record.events.some((event) => event.type === 'execution.completed')
  const started = record.events.some((event) => event.type === 'execution.started')

  if (failed) return 'failed'
  if (completed) return 'success'
  if (started) return 'running'
  return 'planned'
}

function timelineFromRecord(record: RinaExecutionRecord, startedAt: number): RuntimeTimelineEvent[] {
  return record.events.map((event, index) => {
    const cognitionLabel = cognitionLabelForIngressEvent(event as RinaExecutionEvent)
    return {
      ...(event as RinaExecutionEvent),
      at: startedAt + index,
      cognitionLabel: cognitionLabel || undefined,
    }
  })
}

function intentTitle(record: RinaExecutionRecord, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim()
  const payload = record.intent.payload
  if (payload && typeof payload === 'object' && typeof (payload as { prompt?: unknown }).prompt === 'string') {
    return String((payload as { prompt: string }).prompt)
  }
  return record.intent.target
}

export function executionReceiptFromRecord(record: RinaExecutionRecord): ExecutionReceipt {
  const receipt = record.receipts[0]
  const failed = record.events.find((event) => event.type === 'execution.failed')
  const verificationResults: string[] = []

  if (record.outcome?.transactionOutcome === 'applied') {
    verificationResults.push('Mutation applied and verified')
  } else if (record.outcome?.transactionOutcome === 'rolled_back') {
    verificationResults.push('Verification failed; changes rolled back')
  } else if (record.outcome?.transactionOutcome === 'failed') {
    verificationResults.push('Verification failed')
  }

  const commandsExecuted = [
    ...(receipt?.commandsExecuted || []),
    ...(typeof record.outcome?.command === 'string' && record.outcome.command.trim() ? [record.outcome.command.trim()] : []),
  ]

  const filesChanged = [...(receipt?.filesChanged || [])]
  const pendingPayload = record.outcome?.pendingApproval?.payload as { path?: string } | undefined
  if (pendingPayload?.path) filesChanged.push(String(pendingPayload.path))

  const startedAt = record.intent.createdAt || Date.now()
  const status = mapStatus(record)
  const completedAt = status === 'running' ? startedAt : Date.now()

  return {
    runId: record.runId,
    transactionId: record.transactions[0]?.id,
    actionsPerformed: record.plan?.steps?.length ? record.plan.steps : record.events.map((event) => String(event.type)),
    filesChanged: [...new Set(filesChanged)],
    commandsExecuted: [...new Set(commandsExecuted)],
    verificationResults,
    rollbackOccurred: Boolean(receipt?.rollback || record.outcome?.transactionOutcome === 'rolled_back'),
    exitCode: receipt?.exitCode ?? (failed ? 1 : status === 'success' ? 0 : -1),
    startedAt,
    completedAt,
  }
}

export function runBlockFromExecutionRecord(
  record: RinaExecutionRecord,
  opts?: { title?: string; workspaceRoot?: string },
): RunBlock {
  const startedAt = record.intent.createdAt || Date.now()
  const status = mapStatus(record)
  const receipt = record.receipts[0]
  const failed = record.events.find((event) => event.type === 'execution.failed')
  const pendingPayload = record.outcome?.pendingApproval?.payload as { unifiedDiff?: string; path?: string } | undefined

  const diffSummary: DiffSummary | undefined =
    pendingPayload?.unifiedDiff || (receipt?.filesChanged?.length ?? 0) > 0
      ? {
          filesChanged: receipt?.filesChanged || (pendingPayload?.path ? [pendingPayload.path] : []),
          unifiedDiff: pendingPayload?.unifiedDiff,
        }
      : undefined

  const memoryNote =
    record.memoryDelta?.updated && record.memoryDelta.note
      ? record.memoryDelta.note
      : record.memoryDelta?.updated
        ? 'Using prior successful fix pattern from this workspace.'
        : undefined

  return {
    id: record.runId,
    runId: record.runId,
    transactionId: record.transactions[0]?.id,
    title: intentTitle(record, opts?.title),
    summary: record.outcome?.explanation || record.plan?.summary,
    command: typeof record.outcome?.command === 'string' ? record.outcome.command : undefined,
    cwd: opts?.workspaceRoot,
    status,
    startedAt,
    completedAt: status === 'running' ? undefined : Date.now(),
    exitCode: receipt?.exitCode ?? (failed ? 1 : status === 'success' ? 0 : undefined),
    receipts: receipt
      ? [{ id: receipt.runId, label: receipt.summary || 'execution receipt' }]
      : [{ id: record.runId, label: 'proof pending' }],
    timeline: timelineFromRecord(record, startedAt),
    diffSummary,
    memoryNote,
  }
}

/** @deprecated Use runBlockFromExecutionRecord — kept for rina-core RunBlock bridge */
export function legacyProductRunBlock(record: RinaExecutionRecord, intentLabel?: string) {
  const block = runBlockFromExecutionRecord(record, { title: intentLabel })
  return {
    runId: block.runId,
    intent: block.title,
    status: block.status === 'rolled_back' ? 'failed' : block.status === 'planned' ? 'planned' : block.status,
    steps: block.timeline.map((event) => event.cognitionLabel || String(event.type)),
    logs: block.summary,
    diff: block.diffSummary?.unifiedDiff,
    exitCode: block.exitCode,
    receipt: {
      artifacts: block.receipts.map((entry) => entry.id),
      rollback: block.status === 'rolled_back',
    },
  }
}

export function receiptSummaryLine(record: RinaExecutionRecord): string | null {
  const receipt = executionReceiptFromRecord(record)
  if (!receipt.actionsPerformed.length && !receipt.commandsExecuted.length) return null
  return `Receipt: exit ${receipt.exitCode}, rollback ${receipt.rollbackOccurred ? 'yes' : 'no'}, commands ${receipt.commandsExecuted.join(' · ') || 'n/a'}`
}
