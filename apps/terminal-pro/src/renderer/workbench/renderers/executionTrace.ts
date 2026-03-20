import type { ExecutionTraceBlock, WorkbenchState } from '../store.js'
import { mountMarkup } from '../dom.js'
import { escapeHtml } from './format.js'

export function renderExecutionTraceBlock(block: ExecutionTraceBlock): string {
  return `
    <div class="tb ${escapeHtml(block.status)}" data-block-id="${escapeHtml(block.id)}">
      <div class="tb-head">
        <span class="tb-status">${escapeHtml(block.status.toUpperCase())}</span>
        ${block.runId ? `<span class="tb-meta">runId: <code>${escapeHtml(block.runId)}</code></span>` : ''}
      </div>
      ${block.cmd ? `<div class="tb-cmd"><code>${escapeHtml(block.cmd)}</code></div>` : ''}
      <pre class="tb-out">${escapeHtml(block.output)}</pre>
    </div>
  `
}

export function renderExecutionTrace(state: WorkbenchState): void {
  const root = document.getElementById('execution-trace-output')
  if (!root) return
  mountMarkup(
    root,
    state.executionTrace.blocks.length > 0
      ? state.executionTrace.blocks.slice(-60).map(renderExecutionTraceBlock).join('')
      : `
        <div class="rw-execution-trace-empty">
          <div class="rw-execution-trace-empty-title">Execution trace</div>
          <div class="rw-execution-trace-empty-copy">Rina can build, test, and fix in the background. This stream exists only as low-level proof when you need command details.</div>
        </div>
      `
  )
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
