import { el } from '../dom.js'
import type { RecoveryStripViewModel } from '../view-models/agentThreadModel.js'

function renderActionButton(action: { label: string; className: string; dataset: Record<string, string | undefined> }): HTMLElement {
  return el('button', { class: action.className, dataset: action.dataset }, action.label)
}

export function renderRecoveryStrip(model: RecoveryStripViewModel): HTMLElement {
  return el(
    'section',
    {
      class: ['rw-recovery-strip', model.compact ? 'is-collapsed' : ''].filter(Boolean).join(' '),
      dataset: { recoveryExpanded: String(model.expanded) },
    },
    el(
      'div',
      { class: 'rw-recovery-strip-head' },
      el('div', { class: 'rw-recovery-strip-title' }, 'I recovered your last session safely'),
      el('div', { class: 'rw-recovery-strip-badge' }, `${model.restoredCount} items restored`)
    ),
    el('p', { class: 'rw-recovery-strip-copy' }, model.summary),
    el('div', { class: 'rw-inline-actions rw-inline-actions-recovery' }, ...model.actions.map(renderActionButton))
  )
}

export function renderRecoveryToggleButton(container: HTMLButtonElement, restoredCount: number, expanded: boolean): void {
  if (restoredCount === 0) {
    container.hidden = true
    container.textContent = 'Recovered runs'
    container.title = ''
    delete container.dataset.recoveryToggle
    delete container.dataset.recoveryExpanded
    return
  }
  container.hidden = false
  container.dataset.recoveryToggle = 'topbar'
  container.dataset.recoveryExpanded = String(expanded)
  container.textContent = expanded ? 'Hide recovery' : 'Recovered session'
  container.title = expanded ? 'Collapse recovered-session details' : `${restoredCount} restored run${restoredCount === 1 ? '' : 's'} available`
}
