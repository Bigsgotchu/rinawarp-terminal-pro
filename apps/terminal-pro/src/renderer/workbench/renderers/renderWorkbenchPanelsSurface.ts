import type { WorkbenchState } from '../store.js'
import { renderBrain, renderCode, renderDiagnostics, renderMarketplace } from './secondaryPanels.js'

export function renderWorkbenchPanelsSurface(state: WorkbenchState): void {
  renderMarketplace(state)
  renderCode(state)
  renderDiagnostics(state)
  renderBrain(state)
}
