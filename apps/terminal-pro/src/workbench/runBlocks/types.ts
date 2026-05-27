import type { RinaExecutionEvent } from '@rinawarp/rina-core'

export type RunBlockStatus = 'planned' | 'running' | 'success' | 'failed' | 'rolled_back'

export type ReceiptRef = {
  id: string
  label?: string
}

export type DiffSummary = {
  filesChanged: string[]
  hint?: string
  unifiedDiff?: string
}

export type RuntimeTimelineEvent = RinaExecutionEvent & {
  at: number
  cognitionLabel?: string
}

export interface RunBlock {
  id: string
  runId: string
  transactionId?: string

  title: string
  summary?: string

  command?: string
  cwd?: string

  status: RunBlockStatus

  startedAt: number
  completedAt?: number

  exitCode?: number

  receipts: ReceiptRef[]
  timeline: RuntimeTimelineEvent[]

  diffSummary?: DiffSummary

  memoryNote?: string
}

export interface ExecutionReceipt {
  runId: string
  transactionId?: string

  actionsPerformed: string[]
  filesChanged: string[]

  commandsExecuted: string[]

  verificationResults: string[]

  rollbackOccurred: boolean

  exitCode: number

  startedAt: number
  completedAt: number
}
