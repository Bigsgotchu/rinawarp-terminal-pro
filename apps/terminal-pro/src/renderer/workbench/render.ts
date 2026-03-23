import type { TabKey, WorkbenchState } from './store.js'
import { renderExecutionTrace } from './renderers/executionTrace.js'
import { renderBrain, renderCode, renderDiagnostics, renderMarketplace } from './renderers/secondaryPanels.js'
import { renderRuns } from './renderers/runsPanel.js'
import { renderAgent } from './renderers/agentThread.js'
import { renderAgentSurface } from './renderers/renderAgentSurface.js'
import { renderWorkbenchPanelsSurface } from './renderers/renderWorkbenchPanelsSurface.js'
import { renderFixBlocks } from './renderers/fixBlocksPanel.js'
import { renderReceiptPanel } from './renderers/receiptPanel.js'
import { renderProofSurface } from './renderers/renderProofSurface.js'
import { applyWorkbenchShellChrome } from '../modern/workbenchShellChromeSurface.js'
import { resolveLegacyRendererFallbackEnabled } from '../modern/legacyRendererFallback.js'
export function renderWorkbench(state: WorkbenchState): void {
  applyWorkbenchShellChrome(state)
  renderExecutionTrace(state)
  const useLegacyFallback = resolveLegacyRendererFallbackEnabled({
    storage: window.localStorage,
    documentElement: document.documentElement,
  })
  if (!useLegacyFallback) {
    renderAgentSurface(state)
  } else {
    renderAgent(state)
  }
  renderFixBlocks(state)
  if (!useLegacyFallback) {
    renderProofSurface(state)
  } else {
    renderRuns(state)
    renderReceiptPanel(state)
  }
  if (!useLegacyFallback) {
    renderWorkbenchPanelsSurface(state)
  } else {
    renderMarketplace(state)
    renderCode(state)
    renderDiagnostics(state)
    renderBrain(state)
  }
}
