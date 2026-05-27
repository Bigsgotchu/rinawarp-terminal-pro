import type { ExecutionReceipt, RunBlock } from '../runBlocks/types.js'

export type ThreadCognitionLine = {
  ts: number
  eventType: string
  label: string
}

export interface ThreadItemBase {
  id: string
  createdAt: number
  workspaceKey: string
}

export interface UserMessageItem extends ThreadItemBase {
  type: 'user-message'
  text: string
}

export interface AssistantMessageItem extends ThreadItemBase {
  type: 'assistant-message'
  text: string
  /** When false, UI must not imply completion without proof. */
  proofBacked?: boolean
}

export interface AssistantPlanItem extends ThreadItemBase {
  type: 'assistant-plan'
  summary: string
  steps: string[]
  runId?: string
}

export interface RunBlockItem extends ThreadItemBase {
  type: 'run-block'
  run: RunBlock
}

export interface CognitionStreamItem extends ThreadItemBase {
  type: 'cognition-stream'
  runId: string
  lines: ThreadCognitionLine[]
}

export interface MemoryNoteItem extends ThreadItemBase {
  type: 'memory-note'
  runId?: string
  text: string
}

export interface VerificationItem extends ThreadItemBase {
  type: 'verification'
  runId: string
  results: string[]
}

export interface ReceiptItem extends ThreadItemBase {
  type: 'receipt'
  receipt: ExecutionReceipt
}

export type ThreadItem =
  | UserMessageItem
  | AssistantMessageItem
  | AssistantPlanItem
  | RunBlockItem
  | CognitionStreamItem
  | MemoryNoteItem
  | VerificationItem
  | ReceiptItem

export const MAX_THREAD_ITEMS = 400
