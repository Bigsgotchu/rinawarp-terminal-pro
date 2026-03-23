import { el } from '../dom.js'

export type ProofChipRow = Array<{ label: string; value: string }>
export type ProofKeyValueRow = Array<{ label: string; value: string }>

export function renderProofEmptyState(title: string, copy: string, extra?: HTMLElement): HTMLElement {
  return el('div', { class: 'rw-empty-state' }, el('div', { class: 'rw-empty-title' }, title), el('div', { class: 'rw-empty-copy' }, copy), extra ?? null)
}

export function renderProofKeyValueGrid(rows: ProofKeyValueRow): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-grid' },
    ...rows.map((row) =>
      el('div', { class: 'rw-receipt-grid-cell' }, el('span', { class: 'rw-receipt-grid-label' }, row.label), el('code', undefined, row.value))
    )
  )
}

export function renderProofSection(title: string, body: HTMLElement): HTMLElement {
  return el('section', { class: 'rw-receipt-section' }, el('div', { class: 'rw-receipt-section-title' }, title), body)
}

export function renderProofTagList(title: string, values: string[]): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-tag-group' },
    el('div', { class: 'rw-receipt-grid-label' }, title),
    el('div', { class: 'rw-receipt-list' }, ...values.map((value) => el('code', undefined, value)))
  )
}

export function renderProofHero(args: {
  kicker: string
  title: string
  copy: string
  chips?: ProofChipRow
}): HTMLElement {
  return el(
    'div',
    { class: 'rw-receipt-hero' },
    el(
      'div',
      { class: 'rw-receipt-header' },
      el('div', { class: 'rw-receipt-kicker' }, args.kicker),
      el('h3', {}, args.title),
      el('p', { class: 'rw-receipt-copy' }, args.copy)
    ),
    args.chips?.length
      ? el(
          'div',
          { class: 'rw-receipt-chip-row' },
          ...args.chips.map((row) => el('div', { class: 'rw-receipt-chip' }, el('span', undefined, row.label), el('strong', undefined, row.value)))
        )
      : null
  )
}
