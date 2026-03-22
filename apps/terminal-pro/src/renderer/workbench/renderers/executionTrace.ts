import type { ExecutionTraceBlock, WorkbenchState } from '../store.js'
import { el, mount } from '../dom.js'

export function renderExecutionTraceBlock(block: ExecutionTraceBlock): HTMLElement {
  const head = el('div', { class: 'tb-head' }, el('span', { class: 'tb-status' }, block.status.toUpperCase()))
  if (block.runId) {
    head.appendChild(el('span', { class: 'tb-meta' }, 'runId: ', el('code', undefined, block.runId)))
  }

  return el(
    'div',
    { class: `tb ${block.status}`, dataset: { blockId: block.id } },
    head,
    block.cmd ? el('div', { class: 'tb-cmd' }, el('code', undefined, block.cmd)) : null,
    el('pre', { class: 'tb-out' }, block.output)
  )
}

export function renderExecutionTrace(state: WorkbenchState): void {
  const root = document.getElementById('execution-trace-output')
  if (!root) return
  const shell =
    state.executionTrace.blocks.length > 0
      ? el('div')
      : el(
          'div',
          { class: 'rw-execution-trace-empty' },
          el('div', { class: 'rw-execution-trace-empty-title' }, 'Execution trace'),
          el(
            'div',
            { class: 'rw-execution-trace-empty-copy' },
            'Rina can build, test, and fix in the background. This stream exists only as low-level proof when you need command details.'
          )
        )
  if (state.executionTrace.blocks.length > 0) {
    for (const block of state.executionTrace.blocks.slice(-60)) {
      shell.appendChild(renderExecutionTraceBlock(block))
    }
  }
  mount(root, shell)
  root.scrollTop = root.scrollHeight

  const thinkingIndicator = document.getElementById('thinking-indicator')
  if (thinkingIndicator) {
    thinkingIndicator.style.display = state.thinking.active ? 'inline-flex' : 'none'
  }

  const thinkingStream = document.getElementById('thinking-stream')
  if (thinkingStream) {
    thinkingStream.textContent = state.thinking.message || state.thinking.stream || ''
    thinkingStream.classList.toggle('visible', Boolean(state.thinking.message || state.thinking.stream))
  }
}
