import type { WorkbenchState } from '../store.js'
import { el, mount } from '../dom.js'
import { formatAnalyticsDate } from './format.js'
import {
  mountBrainSurface,
  mountCodeSurface,
  mountDiagnosticsSurface,
  mountMarketplaceSurface,
} from '../components/secondaryPanelsSurface.js'
import {
  buildBrainPanelModel,
  buildCodePanelModel,
  buildDiagnosticsPanelModel,
  buildMarketplaceModel,
} from '../view-models/secondaryPanelsModel.js'
export { getStatusBarModel, type StatusBarModel } from '../../modern/workbenchShellChromeModel.js'

function buildEmptyState(title: string, copy: string): HTMLElement {
  return el(
    'div',
    { class: 'rw-empty-state' },
    el('div', { class: 'rw-empty-title' }, title),
    el('div', { class: 'rw-empty-copy' }, copy)
  )
}

export function renderMarketplace(state: WorkbenchState): void {
  const root = document.getElementById('marketplace-output')
  if (!root) return
  mountMarketplaceSurface(root, buildMarketplaceModel(state))
}

export function renderCode(state: WorkbenchState): void {
  const root = document.getElementById('workspace-files')
  if (!root) return
  mountCodeSurface(root, buildCodePanelModel(state))
}

export function renderDiagnostics(state: WorkbenchState): void {
  const root = document.getElementById('diagnostics-output')
  if (!root) return
  mountDiagnosticsSurface(root, buildDiagnosticsPanelModel(state))
}

export function renderBrain(state: WorkbenchState): void {
  const statsRoot = document.getElementById('brain-stats')
  const vizRoot = document.getElementById('brain-visualization')
  mountBrainSurface(statsRoot, vizRoot, buildBrainPanelModel(state))
}
