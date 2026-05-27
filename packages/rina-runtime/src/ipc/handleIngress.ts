import { randomUUID } from 'node:crypto'
import type { RinaIntent } from '@rinawarp/rina-core'
import type { RuntimeIngressRequest, RuntimeIngressResponse } from './ingress.js'
import type { RinaEventStream } from '../stream/rinaEventStream.js'
import type { RinaMemoryStore } from '../memory/rinaMemoryStore.js'

export type RuntimeTransaction = {
  id: string
  intent?: RinaIntent
}

export type RuntimeIngressPort = {
  memory: RinaMemoryStore
  stream: RinaEventStream
  evaluatePolicy(intent: RinaIntent): Promise<{ allow: boolean }> | { allow: boolean }
  resolveIntent?(
    intent: RinaIntent,
    context: RuntimeIngressRequest['context'],
  ): Promise<unknown>
  createTransaction(intent: RinaIntent): Promise<RuntimeTransaction> | RuntimeTransaction
  executeTransaction(transaction: RuntimeTransaction): Promise<unknown>
}

export async function handleIngress(
  req: RuntimeIngressRequest,
  runtime: RuntimeIngressPort,
): Promise<RuntimeIngressResponse> {
  const requestId = randomUUID()
  const events: RuntimeIngressResponse['events'] = [
    { type: 'intent.created', intentId: req.intent.id },
  ]

  runtime.stream.emit({ type: 'intent.received' })

  const memoryContext = runtime.memory.getRecent(20)
  if (memoryContext.some((m) => m.type === 'failure')) {
    runtime.stream.emit({
      type: 'plan.generated',
      plan: 'Adjusted strategy due to previous failure pattern',
    })
  }

  const recentMemory = memoryContext
  req.context = {
    ...(req.context || {}),
    memory: recentMemory,
  }

  runtime.stream.emit({ type: 'policy.checking' })
  let policy = await runtime.evaluatePolicy(req.intent)

  const shouldDenyForRepeatedFailures = policy.allow && runtime.memory.containsRepeatedFailures(req.intent)
  const shouldReducePromptingOverhead = runtime.memory.containsSuccessfulPattern(req.intent)

  if (req.context && typeof shouldReducePromptingOverhead === 'boolean') {
    ;(req.context as any).promptingOverheadReduced = shouldReducePromptingOverhead
  }

  if (shouldDenyForRepeatedFailures) {
    policy = { allow: false }
  }

  events.push({
    type: 'policy.evaluated',
    intentId: req.intent.id,
    decision: policy.allow ? 'allow' : 'deny',
  })

  if (!policy.allow) return { requestId, events }

  events.push({ type: 'intent.resolved', intentId: req.intent.id })

  if (req.intent.kind !== 'mutate') {
    const result = runtime.resolveIntent
      ? await runtime.resolveIntent(req.intent, req.context)
      : undefined
    return { requestId, events, result }
  }

  const transaction = await runtime.createTransaction(req.intent)
  events.push({ type: 'transaction.created', transactionId: transaction.id })
  events.push({ type: 'execution.started', transactionId: transaction.id })

  runtime.stream.emit({
    type: 'transaction.created',
    id: transaction.id,
  })

  runtime.stream.emit({ type: 'execution.running' })

  try {
    const result = await runtime.executeTransaction(transaction)
    if ((result as any)?.transactionOutcome === 'rolled_back') {
      runtime.stream.emit({ type: 'rollback.triggered' })
    }
    events.push({ type: 'execution.completed', transactionId: transaction.id })
    runtime.stream.emit({ type: 'execution.complete' })
    return { requestId, events, result }
  } catch (error) {
    events.push({
      type: 'execution.failed',
      transactionId: transaction.id,
      error: error instanceof Error ? error.message : String(error),
    })
    runtime.stream.emit({ type: 'execution.complete' })
    return { requestId, events }
  }
}
