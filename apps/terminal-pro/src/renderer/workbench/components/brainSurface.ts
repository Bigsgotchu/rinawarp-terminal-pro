import { el, mount } from '../dom.js'
import type { buildBrainPanelViewModel } from '../view-models/brainPanelModel.js'

export function mountBrainPanelSurface(
  statsRoot: HTMLElement | null,
  vizRoot: HTMLElement | null,
  model: ReturnType<typeof buildBrainPanelViewModel>
): void {
  if (statsRoot) {
    mount(statsRoot, el('div', { class: 'rw-workbench-panel-surface rw-workbench-panel-surface-brain rw-workbench-panel-surface', dataset: { workbenchPanelType: 'brain-stats' } }, ...model.stats.map((item) => el('div', { class: 'brain-stat rw-workbench-panel-card' }, el('div', { class: `brain-stat-value ${item.className}` }, item.value), el('div', { class: 'brain-stat-label' }, item.label)))))
  }
  if (vizRoot) {
    mount(
      vizRoot,
      el(
        'div',
        { class: 'rw-workbench-panel-surface rw-workbench-panel-surface-brain rw-workbench-panel-surface', dataset: { workbenchPanelType: 'brain-viz' } },
        ...model.events.map((event) =>
          el(
            'div',
            { class: 'brain-flow-wrapper rw-workbench-panel-card' },
            el(
              'div',
              { class: 'brain-flow' },
              el('div', { class: `brain-icon ${event.type}` }, '•'),
              el('div', { class: 'brain-step' }, el('div', { class: 'brain-label' }, event.type.toUpperCase()), el('div', { class: 'brain-text' }, event.message), event.progress !== undefined ? el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill' })) : null)
            )
          )
        )
      )
    )
    for (const [index, event] of model.events.entries()) {
      if (event.progress === undefined) continue
      const fill = vizRoot.querySelectorAll<HTMLElement>('.progress-fill')[index]
      if (fill) fill.style.width = `${event.progress}%`
    }
  }
}
