import type { WorkbenchState } from '../store.js'
import { renderReceiptPanel } from './receiptPanel.js'
import { renderRuns } from './runsPanel.js'

export function renderProofSurface(state: WorkbenchState): void {
  renderRuns(state)
  renderReceiptPanel(state)
}
