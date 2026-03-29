import type { ChatMessage, MessageBlock } from '../store.js'
import { el } from '../dom.js'
import { buildReplyActionDataset } from '../../replies/replyActionDatasets.js'

export function buildMessageBlockNode(block: MessageBlock): HTMLElement | DocumentFragment {
  if (block.type === 'bubble') {
    return el('div', { class: 'rw-message-bubble' }, block.text)
  }
  if (block.type === 'section-label') {
    return el('div', { class: 'rw-card-section-label' }, block.text)
  }
  if (block.type === 'agent-step') {
    return el('div', { class: `agent-step ${block.statusClass}` }, block.text)
  }
  if (block.type === 'copy') {
    return el(
      'div',
      { class: [block.className || 'rw-command-result-copy', block.tone === 'muted' ? 'rw-command-result-empty' : ''].filter(Boolean).join(' ') },
      block.text
    )
  }
  if (block.type === 'inline-code') {
    return el('div', { class: block.className || 'rw-reply-inline-code' }, block.text)
  }
  if (block.type === 'reply-list') {
    const list = el('ul', { class: 'rw-reply-list' })
    if (block.items.length === 0 && block.emptyText) {
      list.appendChild(el('li', undefined, block.emptyText))
      return list
    }
    for (const item of block.items) {
      const li = el('li')
      const titleRow = el('div', { class: item.code || item.badge || item.text ? 'rw-plan-step-title' : '' })
      const compactCode = typeof item.code === 'string' && item.code.trim().length > 0 && item.code.length <= 72 && !item.text
      titleRow.appendChild(item.strongTitle ? el('strong', undefined, item.title) : document.createTextNode(item.title))
      if (item.badge) {
        titleRow.appendChild(el('span', { class: 'rw-reply-card-badge' }, item.badge))
      }
      if (compactCode) {
        titleRow.appendChild(el('code', { class: 'rw-inline-code-chip' }, item.code as string))
      }
      li.appendChild(titleRow)
      if (item.text) li.appendChild(el('div', { class: 'rw-command-result-copy' }, item.text))
      if (item.code && !compactCode) li.appendChild(el('div', { class: 'rw-reply-inline-code' }, item.code))
      list.appendChild(li)
    }
    return list
  }
  if (block.type === 'stat-grid') {
    return el(
      'div',
      { class: 'rw-stat-grid' },
      ...block.items.map((item) =>
        el(
          'div',
          { class: 'rw-stat-pill' },
          el('span', undefined, item.label),
          el('strong', undefined, item.value)
        )
      )
    )
  }
  if (block.type === 'proof-summary') {
    return el(
      'div',
      { class: 'rw-proof-summary-grid' },
      ...block.items.map((item) =>
        el(
          'div',
          { class: 'rw-proof-summary-item' },
          el('span', undefined, item.label),
          item.emphasis === 'code' ? el('code', undefined, item.value) : el('strong', undefined, item.value)
        )
      )
    )
  }
  if (block.type === 'inline-actions') {
    return el(
      'div',
      { class: 'rw-inline-actions' },
      ...block.actions.map((action) =>
        el(
          'button',
          {
                class: ['rw-inline-action', action.className].filter(Boolean).join(' '),
              dataset: buildReplyActionDataset(action),
            },
          action.label
        )
      )
    )
  }
  if (block.type === 'reply-card') {
    const persistentCardClasses = ['rw-command-result-card', 'rw-recovery-card', 'halted']
    const blockClasses = (block.className || '').split(/\s+/).filter(Boolean)
    const useCardShell = blockClasses.some((name) => persistentCardClasses.includes(name))
    const kindClass = block.kind ? (useCardShell ? `rw-reply-card-${block.kind}` : `rw-message-section-${block.kind}`) : ''
    const showHead = useCardShell || Boolean(block.badge)
    const container = el('div', {
      class: [useCardShell ? 'rw-reply-card' : 'rw-message-section', !useCardShell && !showHead ? 'is-plain' : '', kindClass, block.className || '']
        .filter(Boolean)
        .join(' '),
    })
    if (showHead) {
      const head = el(
        'div',
        { class: useCardShell ? 'rw-reply-card-head' : 'rw-message-section-head' },
        el('div', { class: useCardShell ? 'rw-reply-card-label' : 'rw-message-section-label' }, block.label)
      )
      if (block.badge) {
        head.appendChild(el('div', { class: useCardShell ? 'rw-reply-card-badge' : 'rw-message-section-badge' }, block.badge))
      }
      container.appendChild(head)
    }
    if (Array.isArray(block.bodyBlocks) && block.bodyBlocks.length > 0) {
      for (const child of block.bodyBlocks) container.appendChild(buildMessageBlockNode(child))
    }
    if (Array.isArray(block.actions) && block.actions.length > 0) {
      container.appendChild(
        el(
          'div',
          { class: 'rw-inline-actions' },
          ...block.actions.map((action) =>
            el(
              'button',
              {
                class: ['rw-inline-action', action.className].filter(Boolean).join(' '),
                dataset: buildReplyActionDataset(action),
              },
              action.label
            )
          )
        )
      )
    }
    return container
  }
  return document.createDocumentFragment()
}

export function appendMessageContent(node: HTMLElement, message: ChatMessage): void {
  if (Array.isArray(message.content) && message.content.length > 0) {
    for (const block of message.content) {
      node.appendChild(buildMessageBlockNode(block))
    }
  }
}
