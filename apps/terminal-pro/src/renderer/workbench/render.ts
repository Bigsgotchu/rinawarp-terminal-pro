import type { TabKey, WorkbenchState } from './store.js'
import { hasExecutionTraceActivity } from './agentLaunchState.js'
import { renderExecutionTrace } from './renderers/executionTrace.js'
import { renderAgentSurface } from './renderers/renderAgentSurface.js'
import { renderWorkbenchPanelsSurface } from './renderers/renderWorkbenchPanelsSurface.js'
import { renderFixBlocks } from './renderers/fixBlocksPanel.js'
import { renderProofSurface } from './renderers/renderProofSurface.js'
import { applyWorkbenchShellChrome } from '../modern/workbenchShellChromeSurface.js'

export function renderWorkbench(state: WorkbenchState): void {
  applyWorkbenchShellChrome(state)
  if (hasExecutionTraceActivity(state)) {
    renderExecutionTrace(state)
  } else {
    const root = document.getElementById('execution-trace-output')
    if (root) root.replaceChildren()
    const thinkingIndicator = document.getElementById('thinking-indicator')
    if (thinkingIndicator) thinkingIndicator.style.display = 'none'
    const thinkingStream = document.getElementById('thinking-stream')
    if (thinkingStream) {
      thinkingStream.textContent = ''
      thinkingStream.classList.remove('visible')
    }
  }
  renderAgentSurface(state)
  renderFixBlocks(state)
  renderProofSurface(state)
  renderWorkbenchPanelsSurface(state)
}
