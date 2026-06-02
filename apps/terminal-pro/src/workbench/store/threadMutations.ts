import type { RinaExecutionRecord } from '@rinawarp/rina-core'
import { executionReceiptFromRecord, runBlockFromExecutionRecord } from '../runBlocks/fromExecutionRecord.js'
import { buildExecutionSummaryText, buildMemorySurfaceText } from '../runBlocks/executionSummary.js'
import type {
  AssistantMessageItem,
  AssistantPlanItem,
  CognitionStreamItem,
  MemoryNoteItem,
  ReceiptItem,
  RunBlockItem,
  ThreadCognitionLine,
  ThreadItem,
  VerificationItem,
} from './threadTypes.js'
import { MAX_THREAD_ITEMS } from './threadTypes.js'

export type ThreadWorkbenchSlice = {
  thread: ThreadItem[]
  chat: Array<{
    id: string
    role: 'user' | 'rina' | 'system'
    content?: Array<{ type: string; text?: string }>
    ts: number
    workspaceKey: string
    runIds?: string[]
  }>
  runBlocksById: Record<string, RunBlockItem['run']>
  executionReceiptsByRunId?: Record<string, import('../runBlocks/types.js').ExecutionReceipt>
  liveCognitionByRunId?: Record<string, ThreadCognitionLine[]>
}

function bubbleText(message: ThreadWorkbenchSlice['chat'][number]): string {
  if (!Array.isArray(message.content)) return ''
  return message.content
    .filter((block): block is { type: 'bubble'; text: string } => block.type === 'bubble')
    .map((block) => block.text)
    .join('\n\n')
    .trim()
}

export function chatMessageToThreadItems(message: ThreadWorkbenchSlice['chat'][number]): ThreadItem[] {
  const text = bubbleText(message)
  if (message.role === 'user') {
    return [
      {
        id: message.id,
        type: 'user-message',
        text: text || '(empty)',
        createdAt: message.ts,
        workspaceKey: message.workspaceKey,
      },
    ]
  }

  const items: ThreadItem[] = []
  if (text) {
    items.push({
      id: message.id,
      type: 'assistant-message',
      text,
      createdAt: message.ts,
      workspaceKey: message.workspaceKey,
      proofBacked: Boolean(message.runIds?.length),
    })
  }

  return items
}

export function appendThreadItems(state: ThreadWorkbenchSlice, items: ThreadItem[]): ThreadWorkbenchSlice {
  if (items.length === 0) return state
  return {
    ...state,
    thread: [...state.thread, ...items].slice(-MAX_THREAD_ITEMS),
  }
}

export function upsertThreadRunBlock(
  state: ThreadWorkbenchSlice,
  run: RunBlockItem['run'],
  workspaceKey: string,
): ThreadWorkbenchSlice {
  const index = state.thread.findIndex((item) => item.type === 'run-block' && item.run.runId === run.runId)
  const next: RunBlockItem = {
    id: index >= 0 ? state.thread[index].id : `thread:run:${run.runId}`,
    type: 'run-block',
    run,
    createdAt: index >= 0 ? state.thread[index].createdAt : run.startedAt,
    workspaceKey,
  }

  if (index >= 0) {
    const thread = [...state.thread]
    thread[index] = next
    return { ...state, thread }
  }

  return appendThreadItems(state, [next])
}

export function upsertThreadCognition(
  state: ThreadWorkbenchSlice,
  runId: string,
  workspaceKey: string,
  line: ThreadCognitionLine,
): ThreadWorkbenchSlice {
  const id = `thread:cognition:${runId}`
  const index = state.thread.findIndex((item) => item.type === 'cognition-stream' && item.runId === runId)
  const existing = index >= 0 ? state.thread[index] : null
  const previous = existing?.type === 'cognition-stream' ? existing.lines : []
  const duplicate = previous.some((entry: ThreadCognitionLine) => entry.eventType === line.eventType && entry.label === line.label)
  if (duplicate) return state

  const lines = [...previous, line].slice(-32)
  const next: CognitionStreamItem = {
    id,
    type: 'cognition-stream',
    runId,
    lines,
    createdAt: existing?.type === 'cognition-stream' ? existing.createdAt : line.ts,
    workspaceKey,
  }

  if (index >= 0) {
    const thread = [...state.thread]
    thread[index] = next
    return { ...state, thread }
  }

  return appendThreadItems(state, [next])
}

export function threadItemsFromExecutionRecord(
  record: RinaExecutionRecord,
  opts: { prompt: string; workspaceKey: string; workspaceRoot?: string; messageId: string },
): ThreadItem[] {
  const runBlock = runBlockFromExecutionRecord(record, { title: opts.prompt, workspaceRoot: opts.workspaceRoot })
  const receipt = executionReceiptFromRecord(record)
  const baseTs = record.intent.createdAt || Date.now()
  const items: ThreadItem[] = []

  if (record.plan?.summary || (record.plan?.steps?.length ?? 0) > 0) {
    items.push({
      id: `${opts.messageId}:plan`,
      type: 'assistant-plan',
      summary: record.plan?.summary || 'Execution plan',
      steps: record.plan?.steps || [],
      runId: record.runId,
      createdAt: baseTs,
      workspaceKey: opts.workspaceKey,
    })
  }

  const summaryText = buildExecutionSummaryText(receipt, runBlock)
  const explanation = summaryText || record.outcome?.explanation || runBlock.summary
  if (explanation) {
    items.push({
      id: opts.messageId,
      type: 'assistant-message',
      text: explanation,
      createdAt: baseTs + 1,
      workspaceKey: opts.workspaceKey,
      proofBacked: true,
    })
  }

  const pendingApproval = record.outcome?.pendingApproval
  const pendingPayload = pendingApproval?.payload as
    | {
        path?: string
        riskLabel?: string
        unifiedDiff?: string
        diffSummary?: string
        rollbackNotes?: string
        verificationCommand?: string
        approvalBoundaryMessage?: string
      }
    | undefined
  if (pendingApproval?.kind === 'file_patch' && pendingPayload) {
    items.push({
      id: `${opts.messageId}:approval`,
      type: 'assistant-message',
      text: [
        'Approval required before editing files.',
        `Risk: ${pendingPayload.riskLabel || 'safe-write'}`,
        `Touched file: ${pendingPayload.path || 'workspace file'}`,
        `Diff: ${pendingPayload.diffSummary || pendingPayload.unifiedDiff || 'Diff preview prepared.'}`,
        `Rollback: ${pendingPayload.rollbackNotes || 'A rollback backup will be created before applying the patch.'}`,
        `Verification: ${pendingPayload.verificationCommand || 'Verification command not recorded.'}`,
        pendingPayload.approvalBoundaryMessage || 'No files have been modified yet.',
      ].join('\n'),
      createdAt: baseTs + 2,
      workspaceKey: opts.workspaceKey,
      proofBacked: true,
    })
  }

  items.push({
    id: `thread:run:${record.runId}`,
    type: 'run-block',
    run: runBlock,
    createdAt: baseTs + 3,
    workspaceKey: opts.workspaceKey,
  })

  const cognitionLines = runBlock.timeline
    .filter((event) => event.cognitionLabel)
    .map((event) => ({
      ts: event.at,
      eventType: String(event.type),
      label: String(event.cognitionLabel),
    }))

  if (cognitionLines.length > 0) {
    items.push({
      id: `thread:cognition:${record.runId}`,
      type: 'cognition-stream',
      runId: record.runId,
      lines: cognitionLines,
      createdAt: baseTs + 4,
      workspaceKey: opts.workspaceKey,
    })
  }

  if (runBlock.memoryNote) {
    items.push({
      id: `thread:memory:${record.runId}`,
      type: 'memory-note',
      runId: record.runId,
      text: buildMemorySurfaceText(runBlock.memoryNote),
      createdAt: baseTs + 5,
      workspaceKey: opts.workspaceKey,
    })
  }

  if (receipt.verificationResults.length > 0) {
    items.push({
      id: `thread:verify:${record.runId}`,
      type: 'verification',
      runId: record.runId,
      results: receipt.verificationResults,
      createdAt: baseTs + 6,
      workspaceKey: opts.workspaceKey,
    })
  }

  items.push({
    id: `thread:receipt:${record.runId}`,
    type: 'receipt',
    receipt,
    createdAt: baseTs + 7,
    workspaceKey: opts.workspaceKey,
  })

  return items
}

export function legacyChatToThread(state: ThreadWorkbenchSlice, workspaceKey: string): ThreadItem[] {
  const messages = state.chat.filter((message) => message.workspaceKey === workspaceKey).slice(-200)
  const items: ThreadItem[] = []
  for (const message of messages) {
    items.push(...chatMessageToThreadItems(message))
    for (const runId of message.runIds || []) {
      const canonical = state.runBlocksById[runId]
      if (canonical) {
        items.push({
          id: `thread:run:${runId}`,
          type: 'run-block',
          run: canonical,
          createdAt: message.ts + 2,
          workspaceKey,
        })
      }
    }
  }
  return items.slice(-MAX_THREAD_ITEMS)
}

export function resolveThreadItems(state: ThreadWorkbenchSlice, workspaceKey: string): ThreadItem[] {
  const canonical = state.thread.filter((item) => item.workspaceKey === workspaceKey).slice(-MAX_THREAD_ITEMS)
  if (canonical.length > 0) return canonical
  return legacyChatToThread(state, workspaceKey)
}
