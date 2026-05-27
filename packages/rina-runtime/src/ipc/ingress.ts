import type { RinaIntent } from '@rinawarp/rina-core'

export type RuntimeIngressRequest = {
  type: 'intent.submit'
  intent: RinaIntent
  context?: {
    projectRoot?: string
    sessionId?: string
    memory?: unknown
  }
}

export type RuntimeEvent =
  | { type: 'intent.created'; intentId: string }
  | { type: 'intent.resolved'; intentId: string }
  | { type: 'policy.evaluated'; intentId: string; decision: 'allow' | 'deny' }
  | { type: 'transaction.created'; transactionId: string }
  | { type: 'execution.started'; transactionId: string }
  | { type: 'execution.progress'; transactionId: string; message: string }
  | { type: 'execution.completed'; transactionId: string }
  | { type: 'execution.failed'; transactionId: string; error: string }
  | { type: 'transaction.rolled_back'; transactionId: string }

export type RuntimeIngressResponse = {
  requestId: string
  events: RuntimeEvent[]
  result?: unknown
}
