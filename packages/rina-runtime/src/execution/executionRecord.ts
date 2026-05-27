import type {
  RinaExecutionEvent,
  RinaExecutionMemoryDelta,
  RinaExecutionOutcome,
  RinaExecutionPlan,
  RinaExecutionReceipt,
  RinaExecutionRecord,
  RinaExecutionResult,
  RinaExecutionTransaction,
  RinaIntent,
} from '@rinawarp/rina-core'
import type { RuntimeEvent, RuntimeIngressResponse } from '../ipc/ingress.js'

function runtimeEventToExecutionEvent(event: RuntimeEvent): RinaExecutionEvent {
  return { ...event }
}

function transactionStatusFromEvents(
  transactionId: string,
  events: RuntimeEvent[],
): RinaExecutionTransaction['status'] {
  if (events.some((event) => event.type === 'transaction.rolled_back' && event.transactionId === transactionId)) {
    return 'rolled_back'
  }
  if (events.some((event) => event.type === 'execution.failed' && event.transactionId === transactionId)) {
    return 'failed'
  }
  if (events.some((event) => event.type === 'execution.completed' && event.transactionId === transactionId)) {
    return 'completed'
  }
  if (events.some((event) => event.type === 'execution.started' && event.transactionId === transactionId)) {
    return 'running'
  }
  return 'created'
}

function extractTransactions(events: RuntimeEvent[]): RinaExecutionTransaction[] {
  const ids = events
    .filter((event): event is Extract<RuntimeEvent, { type: 'transaction.created' }> => event.type === 'transaction.created')
    .map((event) => event.transactionId)

  return ids.map((id) => ({
    id,
    status: transactionStatusFromEvents(id, events),
  }))
}

function agentPayloadToOutcome(result: unknown): RinaExecutionOutcome | undefined {
  if (!result || typeof result !== 'object') return undefined
  const payload = result as Record<string, unknown>
  if (typeof payload.explanation !== 'string') return undefined
  return {
    explanation: payload.explanation,
    risk:
      payload.risk === 'high' || payload.risk === 'medium' || payload.risk === 'low'
        ? payload.risk
        : undefined,
    command: typeof payload.command === 'string' ? payload.command : payload.command == null ? null : undefined,
    transactionOutcome:
      payload.transactionOutcome === 'applied' ||
      payload.transactionOutcome === 'rolled_back' ||
      payload.transactionOutcome === 'failed'
        ? payload.transactionOutcome
        : undefined,
    pendingApproval:
      payload.pendingApproval && typeof payload.pendingApproval === 'object'
        ? (payload.pendingApproval as RinaExecutionOutcome['pendingApproval'])
        : undefined,
    request: payload.request,
  }
}

export function buildExecutionRecord(intent: RinaIntent, response: RuntimeIngressResponse): RinaExecutionRecord {
  const events = response.events.map(runtimeEventToExecutionEvent)
  const transactions = extractTransactions(response.events)
  const failedEvent = response.events.find(
    (event): event is Extract<RuntimeEvent, { type: 'execution.failed' }> => event.type === 'execution.failed',
  )
  const completed = response.events.some((event) => event.type === 'execution.completed')
  const rolledBack = response.events.some((event) => event.type === 'transaction.rolled_back')
  const policyDenied = response.events.some(
    (event): event is Extract<RuntimeEvent, { type: 'policy.evaluated' }> =>
      event.type === 'policy.evaluated' && event.decision === 'deny',
  )

  const runId = transactions[0]?.id || response.requestId
  const outcome =
    agentPayloadToOutcome(response.result) ||
    (policyDenied
      ? {
          explanation: 'This request was not permitted to execute through the runtime ingress.',
          risk: 'medium' as const,
        }
      : undefined)

  const plan: RinaExecutionPlan | undefined = outcome?.explanation
    ? { summary: outcome.explanation }
    : undefined

  const receipts: RinaExecutionReceipt[] = [
    {
      runId,
      exitCode: failedEvent ? 1 : completed ? 0 : undefined,
      artifacts: [runId],
      rollback: rolledBack,
      summary: outcome?.explanation,
    },
  ]

  const memoryDelta: RinaExecutionMemoryDelta | undefined = rolledBack
    ? { updated: true, pattern: 'failure', note: 'Rollback recorded after verification failure.' }
    : completed
      ? { updated: true, pattern: 'success' }
      : undefined

  return {
    runId,
    requestId: response.requestId,
    intent,
    plan,
    transactions,
    events,
    receipts,
    memoryDelta,
    outcome,
  }
}

export function assertRinaExecutionResult(value: unknown): asserts value is RinaExecutionResult {
  if (!value || typeof value !== 'object') {
    throw new Error('RinaExecutionResult must be an object.')
  }

  const record = value as Partial<RinaExecutionRecord>
  if (typeof record.runId !== 'string' || !record.runId.trim()) {
    throw new Error('RinaExecutionResult.runId must be a non-empty string.')
  }
  if (typeof record.requestId !== 'string' || !record.requestId.trim()) {
    throw new Error('RinaExecutionResult.requestId must be a non-empty string.')
  }
  if (!record.intent || typeof record.intent !== 'object' || typeof record.intent.id !== 'string') {
    throw new Error('RinaExecutionResult.intent must include id.')
  }
  if (!Array.isArray(record.events)) {
    throw new Error('RinaExecutionResult.events must be an array.')
  }
  if (!Array.isArray(record.transactions)) {
    throw new Error('RinaExecutionResult.transactions must be an array.')
  }
  if (!Array.isArray(record.receipts)) {
    throw new Error('RinaExecutionResult.receipts must be an array.')
  }
}
