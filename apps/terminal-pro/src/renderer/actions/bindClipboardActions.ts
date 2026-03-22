import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'

export function createClipboardActionHandler(
  store: WorkbenchStore,
  deps: Pick<WorkbenchActionControllerDeps, 'buildTrustSnapshot' | 'setTransientStatusSummary'>
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const copyRunBtn = target.closest<HTMLElement>('[data-run-copy]')
    if (copyRunBtn?.dataset.runCopy) {
      const run = store.getState().runs.find((entry) => entry.id === copyRunBtn.dataset.runCopy)
      if (run?.command) {
        await navigator.clipboard.writeText(run.command)
        deps.setTransientStatusSummary(store, 'Run command copied')
      }
      return true
    }

    const receiptBtn = target.closest<HTMLElement>('[data-fix-receipt]')
    if (receiptBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === receiptBtn.dataset.fixId)
      if (fix) {
        await navigator.clipboard.writeText(fix.runId)
        deps.setTransientStatusSummary(store, 'Run ID copied')
      }
      return true
    }

    if (target.closest('[data-copy-trust-snapshot]')) {
      await navigator.clipboard.writeText(deps.buildTrustSnapshot(store))
      deps.setTransientStatusSummary(store, 'Workspace trust snapshot copied')
      return true
    }

    return false
  }
}
