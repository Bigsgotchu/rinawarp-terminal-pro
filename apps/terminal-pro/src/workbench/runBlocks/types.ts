import type { RinaExecutionEvent } from '@rinawarp/rina-core'
import type { FileChangeReceipt, ExecutionReceipt } from '@rinawarp/rina-contracts'

export type RunBlockStatus = 'planned' | 'running' | 'success' | 'failed' | 'rolled_back'
export type { FileChangeReceipt, ExecutionReceipt } from '@rinawarp/rina-contracts'

export type ReceiptRef = {
  id: string
  label?: string
}

export type RuntimeTimelineEvent = RinaExecutionEvent & {
  at: number
  cognitionLabel?: string
}

import type { VerificationStatus } from '../../structured-session-types.js'

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

  fileChanges?: FileChangeReceipt[]
  memoryNote?: string

  verificationStatus?: VerificationStatus
  evidenceCount?: number
}
