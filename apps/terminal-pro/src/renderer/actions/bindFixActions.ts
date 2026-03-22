import type { WorkbenchActionControllerDeps, WorkbenchActionFixBlockManager } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'

export function createFixActionHandler<TFixBlockManager extends WorkbenchActionFixBlockManager>(
  store: WorkbenchStore,
  fixBlockManager: TFixBlockManager,
  deps: Pick<WorkbenchActionControllerDeps<TFixBlockManager>, 'autoApplyFixFromStore' | 'runFixStepFromStore'>
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const autoBtn = target.closest<HTMLElement>('.fix-auto-apply')
    if (autoBtn?.dataset.fixId) {
      await deps.autoApplyFixFromStore(store, autoBtn.dataset.fixId, fixBlockManager)
      return true
    }

    const runStepBtn = target.closest<HTMLElement>('[data-run-step]')
    if (runStepBtn?.dataset.fixId) {
      const index = Number(runStepBtn.dataset.runStep || '0')
      await deps.runFixStepFromStore(store, runStepBtn.dataset.fixId, index)
      return true
    }

    const revealBtn = target.closest<HTMLElement>('[data-fix-reveal]')
    if (revealBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === revealBtn.dataset.fixId)
      if (fix) await window.rina.revealRunReceipt(fix.runId)
      return true
    }

    if (target.closest('[data-fix-folder]')) {
      await window.rina.openRunsFolder()
      return true
    }

    const proofBtn = target.closest<HTMLElement>('[data-fix-proof]')
    if (proofBtn?.dataset.fixId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === proofBtn.dataset.fixId)
      if (!fix) return true
      try {
        await window.rina.supportBundle()
        store.dispatch({ type: 'fix/upsert', fix: { ...fix, error: undefined } })
      } catch (error) {
        store.dispatch({
          type: 'fix/upsert',
          fix: { ...fix, error: `Support bundle failed: ${error instanceof Error ? error.message : String(error)}` },
        })
      }
      return true
    }

    return false
  }
}
