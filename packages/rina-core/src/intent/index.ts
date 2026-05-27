export type RinaIntent = {
  id: string

  source:
    | 'ui'
    | 'mcp'
    | 'cloud'
    | 'agent'
    | 'system'

  kind:
    | 'read'
    | 'analyze'
    | 'mutate'
    | 'execute'

  target: string

  payload?: unknown

  createdAt: number
}

export type MutationRequirement =
  | 'none'
  | 'transaction-required'

export type IntentResolution = {
  intentId: string

  requiresTransaction: boolean

  transactionId?: string
}
