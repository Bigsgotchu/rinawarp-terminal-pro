import type { RinaIntent } from '../intent/index.js'

export type RinaExecutionEvent = {
  type: string
  [key: string]: unknown
}

export type RinaExecutionPlan = {
  summary: string
  steps?: string[]
}

export type RinaExecutionTransaction = {
  id: string
  status: 'created' | 'running' | 'completed' | 'failed' | 'rolled_back'
}

export type RinaExecutionReceipt = {
  runId: string
  exitCode?: number
  artifacts: string[]
  rollback?: boolean
  summary?: string
  commandsExecuted?: string[]
  filesChanged?: string[]
}

export type RinaExecutionMemoryDelta = {
  updated: boolean
  pattern?: 'success' | 'failure'
  note?: string
}

export type RinaExecutionOutcome = {
  explanation: string
  risk?: 'low' | 'medium' | 'high'
  command?: string | null
  transactionOutcome?: 'applied' | 'rolled_back' | 'failed'
  pendingApproval?: {
    kind: 'command' | 'file_patch'
    payload: unknown
  }
  request?: unknown
}

/** Canonical execution identity: one record per intent/run from runtime → UI. */
export type RinaExecutionRecord = {
  runId: string
  requestId: string
  intent: RinaIntent
  plan?: RinaExecutionPlan
  transactions: RinaExecutionTransaction[]
  events: RinaExecutionEvent[]
  receipts: RinaExecutionReceipt[]
  memoryDelta?: RinaExecutionMemoryDelta
  outcome?: RinaExecutionOutcome
}

/** Single output contract for all runtime and IPC boundaries. */
export type RinaExecutionResult = RinaExecutionRecord

/** Agent Thread run block (product contract UX unit). */
export type RunBlock = {
  runId: string
  intent: string
  status: 'planned' | 'running' | 'success' | 'failed'
  steps: string[]
  logs?: string
  diff?: string
  exitCode?: number
  receipt: {
    artifacts: string[]
    rollback?: boolean
  }
}
