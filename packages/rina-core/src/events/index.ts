export type IntentEvent = {
  type: 'intent.created'

  intentId: string

  source: string

  kind: string

  timestamp: number
}

export type TransactionEvent = {
  type:
    | 'transaction.created'
    | 'transaction.proposed'
    | 'transaction.approved'
    | 'transaction.rejected'
    | 'transaction.applied'
    | 'transaction.rolled_back'

  transactionId: string

  timestamp: number
}

export type ExecutionEvent = {
  type:
    | 'execution.started'
    | 'execution.completed'
    | 'execution.failed'

  transactionId: string

  timestamp: number

  error?: string
}

export type PolicyEvent = {
  type:
    | 'policy.evaluated'
    | 'policy.approved'
    | 'policy.rejected'

  intentId: string

  policyLevel: string

  timestamp: number
}

export type RinaEvent =
  | IntentEvent
  | TransactionEvent
  | ExecutionEvent
  | PolicyEvent
