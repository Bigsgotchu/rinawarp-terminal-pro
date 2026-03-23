import type { WorkbenchState } from '../store.js'
import { mountReceiptPanel } from '../components/receiptSurface.js'
import { buildReceiptPanelModel } from '../view-models/receiptPanelModel.js'

export function renderReceiptPanel(state: WorkbenchState): void {
  const root = document.getElementById('receipt-output')
  if (!root) return
  mountReceiptPanel(root, buildReceiptPanelModel(state))
}
