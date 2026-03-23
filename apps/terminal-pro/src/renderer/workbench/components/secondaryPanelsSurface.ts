import { el, mount } from '../dom.js'
import { mountMarketplacePanelSurface } from './marketplaceSurface.js'
import { mountCodePanelSurface } from './codeSurface.js'
import { mountDiagnosticsWorkbenchSurface } from './diagnosticsWorkbenchSurface.js'
import { mountBrainPanelSurface } from './brainSurface.js'

export function mountMarketplaceSurface(
  root: HTMLElement,
  model: ReturnType<typeof import('../view-models/secondaryPanelsModel.js').buildMarketplaceModel>
): void {
  mountMarketplacePanelSurface(root, model)
}

export function mountCodeSurface(root: HTMLElement, model: ReturnType<typeof import('../view-models/secondaryPanelsModel.js').buildCodePanelModel>): void {
  mountCodePanelSurface(root, model)
}

export function mountDiagnosticsSurface(root: HTMLElement, model: ReturnType<typeof import('../view-models/secondaryPanelsModel.js').buildDiagnosticsPanelModel>): void {
  mountDiagnosticsWorkbenchSurface(root, model)
}

export function mountBrainSurface(
  statsRoot: HTMLElement | null,
  vizRoot: HTMLElement | null,
  model: ReturnType<typeof import('../view-models/secondaryPanelsModel.js').buildBrainPanelModel>
): void {
  mountBrainPanelSurface(statsRoot, vizRoot, model)
}
