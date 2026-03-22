import type { RunModel, WorkbenchState } from '../store.js'
import { formatRunStatusForDisplay } from '../proof.js'
import { el } from '../dom.js'

const MAX_VISIBLE_LINKED_RUNS = 3

function buildLinkedRunButton(run: RunModel): HTMLElement {
  const button = el(
    'button',
    { class: 'rw-linked-run', dataset: { openRun: run.id } },
    el('span', undefined, `Run ${run.id}`),
    el('span', { class: `rw-linked-run-status ${run.status}` }, formatRunStatusForDisplay(run))
  )
  if (run.restored) {
    button.appendChild(el('span', { class: 'rw-linked-run-note' }, 'RESTORED'))
  }
  return button
}

function buildRecoveryRunButton(run: RunModel): HTMLElement {
  const button = el(
    'button',
    { class: 'rw-linked-run', dataset: { openRun: run.id } },
    el('span', undefined, run.command || run.title || run.id),
    el('span', { class: `rw-linked-run-status ${run.status}` }, formatRunStatusForDisplay(run))
  )
  if (run.restored) {
    button.appendChild(el('span', { class: 'rw-linked-run-note' }, 'RESTORED'))
  }
  return button
}

function buildPlaceholder(copy: string): HTMLElement {
  return el('div', { class: 'rw-runlinks-placeholder' }, copy)
}

export function renderLinkedRunsNode(
  _state: WorkbenchState,
  messageId: string,
  linkedRuns: RunModel[],
  unresolvedRunIds: string[] = []
): HTMLElement | null {
  if (linkedRuns.length === 0 && unresolvedRunIds.length === 0) return null
  const isRecoveryMessage = messageId.startsWith('system:runs:restore:')
  if (isRecoveryMessage) {
    const latestInterrupted = linkedRuns.find((run) => run.status === 'interrupted') || linkedRuns[0]
    const hiddenCount = Math.max(0, linkedRuns.length - (latestInterrupted ? 1 : 0))
    const root = el('div', { class: 'rw-runlinks rw-runlinks-recovery' })
    if (latestInterrupted) {
      root.appendChild(el('div', { class: 'rw-linked-runs' }, buildRecoveryRunButton(latestInterrupted)))
    }
    const controls = el('div', { class: 'rw-runlinks-controls' })
    if (latestInterrupted) {
      controls.appendChild(el('button', { class: 'rw-link-btn', dataset: { runResume: latestInterrupted.id } }, 'Resume latest'))
    }
    controls.appendChild(el('button', { class: 'rw-link-btn', dataset: { openRunsPanel: messageId } }, 'Review recovered runs'))
    if (hiddenCount > 0) {
      controls.appendChild(el('span', { class: 'rw-runlinks-more' }, `${hiddenCount} more in Runs`))
    }
    root.appendChild(controls)
    if (unresolvedRunIds.length > 0) {
      root.appendChild(
        buildPlaceholder(
          `${unresolvedRunIds.length} recovered run${unresolvedRunIds.length === 1 ? '' : 's'} still restoring. Open Runs to inspect receipts.`
        )
      )
    }
    return root
  }
  const visibleRuns = linkedRuns.slice(0, MAX_VISIBLE_LINKED_RUNS)
  const hiddenCount = Math.max(0, linkedRuns.length - visibleRuns.length)
  const interruptedCount = linkedRuns.filter((run) => run.status === 'interrupted').length
  const root = el('div', { class: 'rw-runlinks' })
  const runs = el('div', { class: 'rw-linked-runs' })
  for (const run of visibleRuns) runs.appendChild(buildLinkedRunButton(run))
  root.appendChild(runs)
  if (linkedRuns.length > MAX_VISIBLE_LINKED_RUNS) {
    const controls = el('div', { class: 'rw-runlinks-controls' })
    controls.appendChild(
      el('button', { class: 'rw-link-btn', dataset: { openRunsPanel: messageId } }, `View all runs (${linkedRuns.length})`)
    )
    if (hiddenCount > 0) {
      controls.appendChild(el('span', { class: 'rw-runlinks-more' }, `+${hiddenCount} more`))
    }
    root.appendChild(controls)
  }
  if (interruptedCount > 0) {
    const interruptedRun = linkedRuns.find((run) => run.status === 'interrupted')
    if (interruptedRun) {
      root.appendChild(
        el(
          'div',
          { class: 'rw-runlinks-controls' },
          el('button', { class: 'rw-link-btn', dataset: { runResume: interruptedRun.id } }, 'Resume interrupted run')
        )
      )
    }
  }
  if (unresolvedRunIds.length > 0) {
    root.appendChild(
      buildPlaceholder(
        `${unresolvedRunIds.length} linked run${unresolvedRunIds.length === 1 ? '' : 's'} still restoring. Open Runs to inspect recovered receipts.`
      )
    )
  }
  return root
}
