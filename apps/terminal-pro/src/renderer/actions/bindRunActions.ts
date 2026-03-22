import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'

export function createRunActionHandler(
  store: WorkbenchStore,
  deps: Pick<
    WorkbenchActionControllerDeps,
    'trackRendererEvent' | 'sendPromptToRina' | 'buildInterruptedRunRecoveryPrompt'
  >
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const toggleRunOutputBtn = target.closest<HTMLElement>('[data-run-toggle-output]')
    if (toggleRunOutputBtn?.dataset.runToggleOutput) {
      const runId = toggleRunOutputBtn.dataset.runToggleOutput
      store.dispatch({ type: 'ui/toggleRunOutput', runId })
      const expanded = store.getState().ui.expandedRunOutputByRunId[runId] ?? false
      if (expanded) {
        store.dispatch({ type: 'analytics/track', event: 'run_output_expanded' })
        void deps.trackRendererEvent('run_output_expanded', {
          run_id: runId,
          workspace_key: store.getState().workspaceKey,
        })
      }
      const hasTail = Boolean((store.getState().runOutputTailByRunId[runId] || '').trim())
      if (expanded && !hasTail) {
        const run = store.getState().runs.find((entry) => entry.id === runId)
        if (run?.sessionId && typeof window.rina.runsTail === 'function') {
          const result = await window.rina.runsTail({
            runId,
            sessionId: run.sessionId,
            maxLines: 200,
            maxBytes: 256 * 1024,
          })
          if (result?.ok && typeof result.tail === 'string') {
            store.dispatch({ type: 'runs/setOutputTail', runId, tail: result.tail })
          } else if (!result?.ok && result?.error) {
            store.dispatch({ type: 'runs/setOutputTail', runId, tail: `Error loading output: ${result.error}` })
          }
        }
      }
      return true
    }

    const runRevealBtn = target.closest<HTMLElement>('[data-run-reveal]')
    if (runRevealBtn) {
      const receiptId = String(runRevealBtn.dataset.runReveal || '')
      if (receiptId) await window.rina.revealRunReceipt(receiptId)
      return true
    }

    const runArtifactsBtn = target.closest<HTMLElement>('[data-run-artifacts]')
    if (runArtifactsBtn?.dataset.runArtifacts) {
      const runId = runArtifactsBtn.dataset.runArtifacts
      const cached = store.getState().runArtifactSummaryByRunId[runId]
      if (!cached) {
        const run = store.getState().runs.find((entry) => entry.id === runId)
        if (run?.sessionId && typeof window.rina.runsArtifacts === 'function') {
          const result = await window.rina.runsArtifacts({
            runId,
            sessionId: run.sessionId,
          })
          if (result?.ok && result.summary) {
            store.dispatch({ type: 'runs/setArtifactSummary', runId, summary: result.summary })
          } else if (!result?.ok && result?.error) {
            store.dispatch({ type: 'ui/setStatusSummary', text: `Artifact load failed: ${result.error}` })
          }
        }
      }
      store.dispatch({ type: 'ui/openDrawer', view: 'runs' })
      return true
    }

    if (target.closest('[data-run-folder]')) {
      await window.rina.openRunsFolder()
      return true
    }

    const rerunBtn = target.closest<HTMLElement>('[data-run-rerun]')
    if (rerunBtn?.dataset.runRerun) {
      const run = store.getState().runs.find((entry) => entry.id === rerunBtn.dataset.runRerun)
      if (run?.command) {
        await deps.sendPromptToRina(store, run.command)
      }
      return true
    }

    const resumeRunBtn = target.closest<HTMLElement>('[data-run-resume]')
    if (resumeRunBtn?.dataset.runResume) {
      const run = store.getState().runs.find((entry) => entry.id === resumeRunBtn.dataset.runResume)
      if (run?.command) {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        await deps.sendPromptToRina(store, deps.buildInterruptedRunRecoveryPrompt(run))
      }
      return true
    }

    return false
  }
}
