import { buildMarketplacePanelModel } from './marketplacePanelModel.js'
import { buildCodePanelViewModel } from './codePanelModel.js'
import { buildDiagnosticsWorkbenchViewModel } from './diagnosticsWorkbenchModel.js'
import { buildBrainPanelViewModel } from './brainPanelModel.js'
import type { WorkbenchState } from '../store.js'

export function buildMarketplaceModel(state: WorkbenchState) {
  return buildMarketplacePanelModel(state)
}

export function buildCodePanelModel(state: WorkbenchState) {
  return buildCodePanelViewModel(state)
}

export function buildDiagnosticsPanelModel(state: WorkbenchState) {
  return buildDiagnosticsWorkbenchViewModel(state)
}

export function buildBrainPanelModel(state: WorkbenchState) {
  return buildBrainPanelViewModel(state)
}
