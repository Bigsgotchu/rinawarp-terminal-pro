import { el, mount } from '../dom.js'
import type { buildDiagnosticsWorkbenchViewModel } from '../view-models/diagnosticsWorkbenchModel.js'

export function mountDiagnosticsWorkbenchSurface(root: HTMLElement, model: ReturnType<typeof buildDiagnosticsWorkbenchViewModel>): void {
  const row = (label: string, value: string) => el('div', { class: 'stat-item' }, el('span', { class: 'stat-label' }, `${label}:`), el('span', { class: 'stat-value' }, value))
  mount(
    root,
    el(
      'div',
      { class: 'rw-workbench-panel-surface rw-workbench-panel-surface-diagnostics rw-workbench-panel-surface', dataset: { workbenchPanelType: 'diagnostics' } },
      ...model.rows.map((entry) => {
        const item = row(entry.label, entry.value)
        item.classList.add('rw-workbench-panel-card')
        return item
      }),
      el('div', { class: 'rw-inline-actions' }, el('button', { class: 'rw-inline-action', dataset: { copyTrustSnapshot: '' } }, 'Copy workspace trust snapshot'))
    )
  )
}
