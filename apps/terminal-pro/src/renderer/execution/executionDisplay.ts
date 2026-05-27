import type { RinaExecutionRecord } from '@rinawarp/rina-core'
import {
  executionReceiptFromRecord,
  persistExecutionReceipt,
  runBlockFromExecutionRecord,
} from '../../workbench/runBlocks/index.js'
import { threadItemsFromExecutionRecord } from '../../workbench/store/threadMutations.js'
import type { RunModel, WorkbenchStore } from '../workbench/store.js'
import { bubbleBlock } from '../replies/renderFragments.js'

export type { RunBlock as CanonicalRunBlock } from '../../workbench/runBlocks/types.js'
export type { RunBlock } from '@rinawarp/rina-core'
export { receiptSummaryLine, executionReceiptFromRecord } from '../../workbench/runBlocks/index.js'
export { runBlockFromExecutionRecord } from './executionRecordMapping.js'

export function runModelFromExecutionRecord(
  record: RinaExecutionRecord,
  opts: { workspaceRoot?: string; originMessageId?: string; title?: string },
): RunModel {
  const block = runBlockFromExecutionRecord(record, { title: opts.title, workspaceRoot: opts.workspaceRoot })
  const status: RunModel['status'] =
    block.status === 'success' ? 'ok' : block.status === 'failed' || block.status === 'rolled_back' ? 'failed' : 'running'
  const now = new Date().toISOString()
  const ended = status === 'ok' || status === 'failed'

  return {
    id: record.runId,
    sessionId: record.requestId,
    title: opts.title || block.title,
    command: block.command || block.title,
    cwd: opts.workspaceRoot || block.cwd || '',
    status,
    startedAt: now,
    updatedAt: now,
    endedAt: ended ? now : null,
    exitCode: block.exitCode ?? null,
    commandCount: Math.max(1, record.transactions.length),
    failedCount: status === 'failed' ? 1 : 0,
    latestReceiptId: block.receipts[0]?.id || record.runId,
    projectRoot: opts.workspaceRoot,
    source: 'ingress',
    originMessageId: opts.originMessageId,
  }
}

export function applyExecutionRecordToWorkbench(
  store: WorkbenchStore,
  record: RinaExecutionRecord,
  opts: { prompt: string; workspaceKey: string; workspaceRoot?: string },
): string {
  const runBlock = runBlockFromExecutionRecord(record, { title: opts.prompt, workspaceRoot: opts.workspaceRoot })
  const receipt = executionReceiptFromRecord(record)
  persistExecutionReceipt(receipt)

  const messageId = `rina:ingress:${Date.now()}`
  const run = runModelFromExecutionRecord(record, {
    workspaceRoot: opts.workspaceRoot,
    originMessageId: messageId,
    title: opts.prompt,
  })

  const threadItems = threadItemsFromExecutionRecord(record, {
    prompt: opts.prompt,
    workspaceKey: opts.workspaceKey,
    workspaceRoot: opts.workspaceRoot,
    messageId,
  })

  store.dispatch({ type: 'thread/append', items: threadItems })
  store.dispatch({ type: 'runBlocks/upsert', block: runBlock })
  store.dispatch({ type: 'executionReceipts/upsert', receipt })
  store.dispatch({ type: 'runs/upsert', run })

  store.dispatch({
    type: 'chat/add',
    msg: {
      id: messageId,
      role: 'rina',
      content: [bubbleBlock(record.outcome?.explanation || runBlock.summary || 'Execution recorded.')],
      ts: Date.now(),
      workspaceKey: opts.workspaceKey,
      runIds: [run.id],
    },
    syncThread: false,
  })

  return messageId
}
