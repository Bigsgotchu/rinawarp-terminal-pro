import { listPersistedReceiptRunIds, loadExecutionReceipt } from '../runBlocks/receiptPersistence.js'
import type { ExecutionReceipt, RunBlock } from '../runBlocks/types.js'
import { buildMemorySurfaceText } from '../runBlocks/executionSummary.js'
import type { ThreadCognitionLine, ThreadItem } from './threadTypes.js'
import { MAX_THREAD_ITEMS } from './threadTypes.js'
import { chatMessageToThreadItems, type ThreadWorkbenchSlice } from './threadMutations.js'

function cognitionItem(runId: string, lines: ThreadCognitionLine[], workspaceKey: string, createdAt: number): ThreadItem {
  return {
    id: `thread:cognition:${runId}`,
    type: 'cognition-stream',
    runId,
    lines,
    createdAt,
    workspaceKey,
  }
}

function receiptItem(receipt: ExecutionReceipt, workspaceKey: string, createdAt: number): ThreadItem {
  return {
    id: `thread:receipt:${receipt.runId}`,
    type: 'receipt',
    receipt,
    createdAt,
    workspaceKey,
  }
}

function runBlockItem(run: RunBlock, workspaceKey: string, createdAt: number): ThreadItem {
  return {
    id: `thread:run:${run.runId}`,
    type: 'run-block',
    run,
    createdAt,
    workspaceKey,
  }
}

function appendRunArtifacts(
  items: ThreadItem[],
  runId: string,
  workspaceKey: string,
  slice: ThreadWorkbenchSlice,
  baseTs: number,
): void {
  const run = slice.runBlocksById[runId]
  if (run) {
    items.push(runBlockItem(run, workspaceKey, baseTs + 2))
    if (run.memoryNote) {
      items.push({
        id: `thread:memory:${runId}`,
        type: 'memory-note',
        runId,
        text: buildMemorySurfaceText(run.memoryNote),
        createdAt: baseTs + 3,
        workspaceKey,
      })
    }
  }

  const live = slice.liveCognitionByRunId?.[runId]
  if (live?.length) {
    items.push(
      cognitionItem(
        runId,
        live.map((line) => ({ ts: line.ts, eventType: line.eventType, label: line.label })),
        workspaceKey,
        baseTs + 4,
      ),
    )
  } else if (run?.timeline?.length) {
    const lines = run.timeline
      .filter((event) => event.cognitionLabel)
      .map((event) => ({
        ts: event.at,
        eventType: String(event.type),
        label: String(event.cognitionLabel),
      }))
    if (lines.length > 0) {
      items.push(cognitionItem(runId, lines, workspaceKey, baseTs + 4))
    }
  }

  const receipt = slice.executionReceiptsByRunId?.[runId] || loadExecutionReceipt(runId)
  if (receipt) {
    if (receipt.verificationResults.length > 0) {
      items.push({
        id: `thread:verify:${runId}`,
        type: 'verification',
        runId,
        results: receipt.verificationResults,
        createdAt: baseTs + 5,
        workspaceKey,
      })
    }
    items.push(receiptItem(receipt, workspaceKey, baseTs + 6))
  }
}

/** Rebuild canonical thread from legacy chat + indexed proof artifacts (no duplicate renderers). */
export function hydrateCanonicalThread(state: ThreadWorkbenchSlice, workspaceKey: string): ThreadItem[] {
  if (state.thread.filter((item) => item.workspaceKey === workspaceKey).length > 0) {
    return state.thread
  }

  const messages = state.chat.filter((message) => message.workspaceKey === workspaceKey).slice(-200)
  const items: ThreadItem[] = []
  const seenRunIds = new Set<string>()

  for (const message of messages) {
    items.push(...chatMessageToThreadItems(message))
    for (const runId of message.runIds || []) {
      if (seenRunIds.has(runId)) continue
      seenRunIds.add(runId)
      appendRunArtifacts(items, runId, workspaceKey, state, message.ts)
    }
  }

  for (const runId of Object.keys(state.runBlocksById)) {
    if (seenRunIds.has(runId)) continue
    seenRunIds.add(runId)
    appendRunArtifacts(items, runId, workspaceKey, state, Date.now())
  }

  for (const runId of listPersistedReceiptRunIds()) {
    if (seenRunIds.has(runId)) continue
    const receipt = loadExecutionReceipt(runId)
    if (!receipt) continue
    seenRunIds.add(runId)
    items.push(receiptItem(receipt, workspaceKey, Date.now()))
  }

  return items.slice(-MAX_THREAD_ITEMS)
}
