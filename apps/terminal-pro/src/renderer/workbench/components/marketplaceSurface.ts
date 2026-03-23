import { el, mount } from '../dom.js'
import type { buildMarketplacePanelModel } from '../view-models/marketplacePanelModel.js'

export function mountMarketplacePanelSurface(root: HTMLElement, model: ReturnType<typeof buildMarketplacePanelModel>): void {
  if (model.loading && model.cards.length === 0) {
    mount(root, el('div', { class: 'rw-empty-state rw-workbench-panel-empty' }, el('div', { class: 'rw-empty-title' }, 'Loading marketplace'), el('div', { class: 'rw-empty-copy' }, 'Fetching available agents and lock states…')))
    return
  }
  if (model.error) {
    mount(root, el('div', { class: 'rw-empty-state rw-workbench-panel-empty' }, el('div', { class: 'rw-empty-title' }, 'Marketplace unavailable'), el('div', { class: 'rw-empty-copy' }, model.error)))
    return
  }
  if (model.isEmpty) {
    mount(root, el('div', { class: 'rw-empty-state rw-workbench-panel-empty' }, el('div', { class: 'rw-empty-title' }, 'No agents published yet'), el('div', { class: 'rw-empty-copy' }, 'Publish or sync marketplace agents to see them here.')))
    return
  }
  mount(
    root,
    el(
      'div',
      { class: 'rw-workbench-panel-surface rw-workbench-panel-surface-marketplace rw-workbench-panel-surface', dataset: { workbenchPanelType: 'marketplace' } },
      el(
        'section',
        { class: 'rw-market-summary rw-workbench-panel-summary' },
        el('div', { class: 'rw-market-summary-copy' }, el('div', { class: 'rw-market-summary-title' }, 'Capability packs extend what Rina can do in the thread.'), el('div', { class: 'rw-market-summary-text' }, 'Install or unlock a pack here, then come back to Agent to run it through the trusted path with proof attached.')),
        el('div', { class: 'rw-market-summary-stats' }, el('span', { class: 'rw-market-summary-pill' }, `Ready ${model.summary.installedCount}`), el('span', { class: 'rw-market-summary-pill' }, `Available ${model.summary.availableCount}`), el('span', { class: 'rw-market-summary-pill' }, `Locked ${model.summary.lockedCount}`))
      ),
      el(
        'section',
        { class: 'rw-market-list rw-workbench-panel-list' },
        ...model.cards.map((card) =>
          el(
            'article',
            { class: 'rw-market-card rw-workbench-panel-card', dataset: { agentName: card.name } },
            el('div', { class: 'rw-market-head' }, el('div', { class: 'rw-market-head-copy' }, el('div', { class: 'rw-market-title' }, card.name), el('div', { class: 'rw-market-subtitle' }, `by ${card.author} · v${card.version}`)), el('div', { class: 'rw-market-badge' }, card.badge)),
            el('div', { class: 'rw-market-copy' }, card.description),
            el('div', { class: 'rw-market-copy' }, card.installCopy),
            el('div', { class: 'rw-market-meta' }, ...card.meta.map((item) => el('span', undefined, item))),
            el('div', { class: 'rw-market-actions' }, el('button', { class: `fix-btn ${card.disabled ? '' : 'primary'}`.trim(), dataset: { marketInstall: card.name }, disabled: card.disabled }, card.actionLabel))
          )
        )
      )
    )
  )
}
