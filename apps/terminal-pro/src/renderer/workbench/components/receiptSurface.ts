import { el, mount } from '../dom.js'
import type { ReceiptPanelModel } from '../view-models/receiptPanelModel.js'
import { renderProofEmptyState, renderProofHero, renderProofKeyValueGrid, renderProofSection, renderProofTagList } from './proofSurface.js'

export function mountReceiptPanel(root: HTMLElement, model: ReceiptPanelModel): void {
  if (model.state === 'empty') {
    const empty = renderProofEmptyState('No Receipt Loaded', 'Select a run to view its receipt.')
    empty.classList.add('rw-proof-empty-state')
    mount(root, empty)
    return
  }
  if (model.state === 'raw') {
    mount(
      root,
      el(
        'div',
        { class: 'rw-receipt-panel rw-receipt-panel' },
        renderProofHero({
          kicker: 'Raw receipt',
          title: 'Receipt payload',
          copy: 'This receipt did not match the structured proof format yet, so it is shown as raw data.',
        }),
        el('pre', { class: 'rw-receipt-content' }, JSON.stringify(model.payload, null, 2))
      )
    )
    return
  }

  mount(
    root,
    el(
      'div',
      { class: 'rw-receipt-panel rw-receipt-panel' },
      renderProofHero({
        kicker: 'Execution proof',
        title: `Receipt ${model.receiptId}`,
        copy: `${model.intentLabel} receipt showing intent, command, workspace, timestamps, exit path, evidence, and the safest next move.`,
        chips: model.chipRows,
      }),
      renderProofSection('Receipt Summary', renderProofKeyValueGrid(model.summaryRows)),
      model.deployRows ? renderProofSection('Deploy State', renderProofKeyValueGrid(model.deployRows)) : null,
      renderProofSection(
        'Execution Trail',
        el(
          'div',
          { class: 'rw-receipt-artifacts' },
          renderProofKeyValueGrid(model.artifactRows),
          el('div', { class: 'rw-receipt-guidance-card' }, el('span', { class: 'rw-receipt-grid-label' }, 'Command'), el('pre', { class: 'rw-receipt-content' }, model.command)),
          model.changedFiles.length ? renderProofTagList('Changed files', model.changedFiles) : null,
          model.diffHints.length ? renderProofTagList('Diff hints', model.diffHints) : null,
          model.urls.length ? renderProofTagList('Artifacts / URLs', model.urls) : null
        )
      ),
      renderProofSection(
        model.guidanceTitle,
        el(
          'div',
          { class: 'rw-receipt-guidance' },
          ...model.guidanceCards.map((card) => el('div', { class: 'rw-receipt-guidance-card' }, el('span', { class: 'rw-receipt-grid-label' }, card.label), el('div', undefined, card.value))),
          el(
            'div',
            { class: 'rw-receipt-guidance-card' },
            el('span', { class: 'rw-receipt-grid-label' }, 'Failure clues'),
            model.failureClues.length ? el('div', { class: 'rw-receipt-list' }, ...model.failureClues.map((item) => el('code', undefined, item))) : el('div', undefined, 'No strong failure clues captured yet.')
          )
        )
      ),
      renderProofSection(
        'Preview',
        el(
          'div',
          { class: 'rw-receipt-preview-stack rw-receipt-preview-stack' },
          ...model.previews.map((preview) =>
            el(
              'div',
              { class: 'rw-receipt-preview' },
              el('div', { class: 'rw-receipt-grid-label' }, preview.label),
              preview.value ? el('pre', { class: 'rw-receipt-content' }, preview.value) : el('div', { class: 'rw-empty-copy' }, 'No preview captured.')
            )
          )
        )
      )
    )
  )
}
