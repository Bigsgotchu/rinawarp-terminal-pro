import type { RunModel, WorkbenchState } from '../store.js'
import { el } from '../dom.js'
import { renderInlineRunBlock } from '../components/agentSurface.js'
import { buildInlineRunViewModel } from '../view-models/agentThreadModel.js'
import type { ThreadItem } from '../../../workbench/store/threadTypes.js'
import type { ExecutionReceipt } from '../../../workbench/runBlocks/types.js'
import { resolveThreadItems } from '../../../workbench/store/threadMutations.js'
import { buildRollbackFailureStory } from '../../../workbench/runBlocks/executionSummary.js'

function runModelFromThreadRun(state: WorkbenchState, runId: string, runBlock: ThreadItem & { type: 'run-block' }): RunModel {
  const existing = state.runs.find((run) => run.id === runId)
  const status =
    runBlock.run.status === 'success'
      ? 'ok'
      : runBlock.run.status === 'failed' || runBlock.run.status === 'rolled_back'
        ? 'failed'
        : 'running'

  return {
    id: runId,
    sessionId: existing?.sessionId || runId,
    title: runBlock.run.title,
    command: runBlock.run.command || runBlock.run.title,
    cwd: runBlock.run.cwd || existing?.cwd || '',
    status,
    startedAt: existing?.startedAt || new Date(runBlock.run.startedAt).toISOString(),
    updatedAt: existing?.updatedAt || new Date(runBlock.run.completedAt || runBlock.run.startedAt).toISOString(),
    endedAt:
      status === 'running'
        ? null
        : existing?.endedAt || new Date(runBlock.run.completedAt || Date.now()).toISOString(),
    exitCode: runBlock.run.exitCode ?? existing?.exitCode ?? null,
    commandCount: existing?.commandCount || 1,
    failedCount: status === 'failed' ? 1 : 0,
    latestReceiptId: runBlock.run.receipts[0]?.id || runId,
    projectRoot: runBlock.run.cwd || existing?.projectRoot,
    source: existing?.source || 'ingress',
    originMessageId: existing?.originMessageId,
    restored: existing?.restored,
  }
}

function formatDurationMs(startedAt: number, completedAt: number): string {
  const seconds = Math.max(1, Math.round((completedAt - startedAt) / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function renderUserMessage(item: Extract<ThreadItem, { type: 'user-message' }>): HTMLElement {
  return el(
    'div',
    { class: 'rw-thread-message user', dataset: { msgId: item.id, threadItem: item.type } },
    el('div', { class: 'rw-thread-author' }, 'You'),
    el('div', { class: 'rw-message-bubble' }, item.text),
  )
}

function renderAssistantMessage(item: Extract<ThreadItem, { type: 'assistant-message' }>): HTMLElement {
  return el(
    'div',
    { class: ['rw-thread-message', 'rina', item.proofBacked ? 'is-proof-backed' : ''].filter(Boolean).join(' '), dataset: { msgId: item.id, threadItem: item.type, proofBacked: item.proofBacked ? 'true' : 'false' } },
    el(
      'div',
      { class: 'rw-thread-author-row' },
      el('div', { class: 'rw-thread-author' }, 'Rina'),
      item.proofBacked ? el('span', { class: 'rw-trust-badge is-verified' }, 'Proof attached') : null
    ),
    el('div', { class: 'rw-message-bubble' }, item.text),
  )
}

function renderAssistantPlan(item: Extract<ThreadItem, { type: 'assistant-plan' }>): HTMLElement {
  const body = el('div', { class: 'rw-message-section rw-message-section-plan' })
  body.appendChild(el('div', { class: 'rw-message-section-label' }, 'Plan'))
  body.appendChild(el('div', { class: 'rw-message-bubble' }, item.summary))
  if (item.steps.length > 0) {
    const list = el('ul', { class: 'rw-reply-list' })
    for (const step of item.steps) {
      list.appendChild(el('li', undefined, step))
    }
    body.appendChild(list)
  }
  return el(
    'div',
    { class: 'rw-thread-message rina has-plan', dataset: { msgId: item.id, threadItem: item.type } },
    el('div', { class: 'rw-thread-author' }, 'Rina'),
    body,
  )
}

function renderRunBlock(state: WorkbenchState, item: Extract<ThreadItem, { type: 'run-block' }>): HTMLElement {
  const run = runModelFromThreadRun(state, item.run.runId, item)
  const wrapper = el('div', {
    class: 'rw-thread-run-artifact',
    dataset: { runId: item.run.runId, threadItem: item.type },
  })
  wrapper.appendChild(renderInlineRunBlock(buildInlineRunViewModel(state, run)))
  return wrapper
}

function renderCognition(item: Extract<ThreadItem, { type: 'cognition-stream' }>): HTMLElement {
  const list = el('ol', { class: 'rw-cognition-stream', 'aria-live': 'polite' })
  for (const line of item.lines) {
    list.appendChild(
      el('li', { class: 'rw-cognition-line', dataset: { eventType: line.eventType } }, el('span', { class: 'rw-cognition-label' }, line.label)),
    )
  }
  return el(
    'div',
    { class: 'rw-thread-cognition', dataset: { runId: item.runId, threadItem: item.type } },
    el('div', { class: 'rw-card-section-label' }, 'Operational stream'),
    list,
  )
}

function renderMemoryNote(item: Extract<ThreadItem, { type: 'memory-note' }>): HTMLElement {
  return el(
    'div',
    {
      class: 'rw-memory-note rw-thread-memory',
      role: 'note',
      dataset: { threadItem: item.type, runId: item.runId || '' },
    },
    el('span', { class: 'rw-memory-note-icon', 'aria-hidden': 'true' }, '◦'),
    item.text,
  )
}

function renderVerification(item: Extract<ThreadItem, { type: 'verification' }>): HTMLElement {
  const passed = item.results.some((result) => /pass|verified|applied/i.test(result))
  const list = el('ul', { class: 'rw-reply-list' })
  for (const result of item.results) {
    list.appendChild(el('li', undefined, result))
  }
  return el(
    'div',
    {
      class: ['rw-thread-verification', passed ? 'is-passed' : 'is-failed'].join(' '),
      dataset: { runId: item.runId, threadItem: item.type },
    },
    el('div', { class: 'rw-card-section-label' }, passed ? 'Verification passed' : 'Verification'),
    list,
  )
}

function receiptActionButtons(receipt: ExecutionReceipt): HTMLElement {
  const actions = el('div', { class: 'rw-receipt-actions' })
  actions.appendChild(
    el('button', { type: 'button', class: 'secondary-btn', dataset: { receiptViewLogs: receipt.runId } }, 'View logs'),
  )
  if (receipt.filesChanged.length > 0) {
    actions.appendChild(
      el('button', { type: 'button', class: 'secondary-btn', dataset: { receiptViewDiff: receipt.runId } }, 'View diff'),
    )
  }
  actions.appendChild(
    el('button', { type: 'button', class: 'secondary-btn', dataset: { receiptReplay: receipt.runId } }, 'Replay'),
  )
  actions.appendChild(
    el('button', { type: 'button', class: 'secondary-btn is-subtle', dataset: { receiptCopy: receipt.runId } }, 'Copy summary'),
  )
  return actions
}

function renderReceipt(state: WorkbenchState, item: Extract<ThreadItem, { type: 'receipt' }>): HTMLElement {
  const receipt = item.receipt
  const verified = receipt.exitCode === 0 && !receipt.rollbackOccurred
  const duration = formatDurationMs(receipt.startedAt, receipt.completedAt)
  const runBlock = state.runBlocksById[receipt.runId]

  const header = el('div', { class: 'rw-receipt-card-header' })
  header.appendChild(el('div', { class: 'rw-receipt-card-title' }, 'Proof'))
  header.appendChild(
    el(
      'span',
      { class: ['rw-trust-badge', verified ? 'is-verified' : receipt.rollbackOccurred ? 'is-rolled-back' : 'is-failed'].join(' ') },
      verified ? 'Verified' : receipt.rollbackOccurred ? 'Rolled back' : 'Failed',
    ),
  )

  const grid = el('div', { class: 'rw-receipt-card-grid' })
  const rows: Array<[string, string]> = [
    ['Run ID', receipt.runId],
    ['Duration', duration],
    ['Exit code', String(receipt.exitCode)],
    ['Rollback', receipt.rollbackOccurred ? 'Yes — workspace restored' : 'No'],
    ['Commands', receipt.commandsExecuted.join(' · ') || '—'],
    ['Files changed', receipt.filesChanged.join(', ') || '—'],
    ['Verification', receipt.verificationResults.join(' · ') || '—'],
  ]
  for (const [label, value] of rows) {
    grid.appendChild(
      el('div', { class: 'rw-receipt-row' }, el('span', { class: 'rw-receipt-label' }, label), el('span', { class: 'rw-receipt-value' }, value)),
    )
  }

  const card = el('div', {
    class: ['rw-receipt-card', verified ? 'is-verified' : receipt.rollbackOccurred ? 'is-rollback' : 'is-failed'].join(' '),
  })
  card.appendChild(header)
  card.appendChild(grid)

  if (receipt.rollbackOccurred) {
    card.appendChild(el('p', { class: 'rw-receipt-failure-story' }, buildRollbackFailureStory(receipt, runBlock)))
  }

  card.appendChild(receiptActionButtons(receipt))
  return el('div', { class: 'rw-thread-receipt', dataset: { runId: receipt.runId, threadItem: item.type } }, card)
}

export function renderThreadItem(state: WorkbenchState, item: ThreadItem): HTMLElement {
  switch (item.type) {
    case 'user-message':
      return renderUserMessage(item)
    case 'assistant-message':
      return renderAssistantMessage(item)
    case 'assistant-plan':
      return renderAssistantPlan(item)
    case 'run-block':
      return renderRunBlock(state, item)
    case 'cognition-stream':
      return renderCognition(item)
    case 'memory-note':
      return renderMemoryNote(item)
    case 'verification':
      return renderVerification(item)
    case 'receipt':
      return renderReceipt(state, item)
    default:
      return el('div', undefined, '')
  }
}

export function renderCanonicalThread(state: WorkbenchState): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const items = resolveThreadItems(state, state.workspaceKey)
  for (const item of items) {
    fragment.appendChild(renderThreadItem(state, item))
  }
  return fragment
}

export function hasCanonicalThreadContent(state: WorkbenchState): boolean {
  return state.thread.filter((item) => item.workspaceKey === state.workspaceKey).length > 0
}
