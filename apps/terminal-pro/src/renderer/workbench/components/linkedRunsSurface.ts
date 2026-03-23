import { el } from '../dom.js'
import { formatRunStatusForDisplay } from '../proof.js'
import type { LinkedRunButtonModel, LinkedRunsModel } from '../view-models/linkedRunsModel.js'

function buildLinkedRunButton(run: LinkedRunButtonModel): HTMLElement {
  const button = el(
    'button',
    { class: 'rw-linked-run', dataset: { openRun: run.id } },
    el('span', undefined, run.label),
    el('span', { class: `rw-linked-run-status ${run.status}` }, formatRunStatusForDisplay({ status: run.status } as any))
  )
  if (run.restored) {
    button.appendChild(el('span', { class: 'rw-linked-run-note' }, 'RESTORED'))
  }
  return button
}

function buildPlaceholder(copy: string): HTMLElement {
  return el('div', { class: 'rw-runlinks-placeholder' }, copy)
}

export function renderLinkedRunsSurface(model: LinkedRunsModel): HTMLElement | null {
  if (model.state === 'empty') return null

  if (model.state === 'recovery') {
    const root = el('div', { class: 'rw-runlinks rw-runlinks-recovery' })
    if (model.latestInterrupted) {
      root.appendChild(el('div', { class: 'rw-linked-runs' }, buildLinkedRunButton(model.latestInterrupted)))
    }
    const controls = el('div', { class: 'rw-runlinks-controls' })
    if (model.latestInterrupted) {
      controls.appendChild(el('button', { class: 'rw-link-btn', dataset: { runResume: model.latestInterrupted.id } }, 'Resume latest'))
    }
    controls.appendChild(el('button', { class: 'rw-link-btn', dataset: { openRunsPanel: model.messageId } }, 'Review recovered runs'))
    if (model.hiddenCount > 0) {
      controls.appendChild(el('span', { class: 'rw-runlinks-more' }, `${model.hiddenCount} more in Runs`))
    }
    root.appendChild(controls)
    if (model.unresolvedCount > 0) {
      root.appendChild(
        buildPlaceholder(
          `${model.unresolvedCount} recovered run${model.unresolvedCount === 1 ? '' : 's'} still restoring. Open Runs to inspect receipts.`
        )
      )
    }
    return root
  }

  const root = el('div', { class: 'rw-runlinks' })
  root.appendChild(el('div', { class: 'rw-linked-runs' }, ...model.visibleRuns.map(buildLinkedRunButton)))
  if (model.totalCount > model.visibleRuns.length) {
    const controls = el('div', { class: 'rw-runlinks-controls' })
    controls.appendChild(el('button', { class: 'rw-link-btn', dataset: { openRunsPanel: model.messageId } }, `View all runs (${model.totalCount})`))
    if (model.hiddenCount > 0) {
      controls.appendChild(el('span', { class: 'rw-runlinks-more' }, `+${model.hiddenCount} more`))
    }
    root.appendChild(controls)
  }
  if (model.interruptedRunId) {
    root.appendChild(
      el(
        'div',
        { class: 'rw-runlinks-controls' },
        el('button', { class: 'rw-link-btn', dataset: { runResume: model.interruptedRunId } }, 'Resume interrupted run')
      )
    )
  }
  if (model.unresolvedCount > 0) {
    root.appendChild(
      buildPlaceholder(
        `${model.unresolvedCount} linked run${model.unresolvedCount === 1 ? '' : 's'} still restoring. Open Runs to inspect recovered receipts.`
      )
    )
  }
  return root
}
