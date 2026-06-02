import type { WorkbenchActionControllerDeps } from './actionController.js'
import { WorkbenchStore } from '../workbench/store.js'
import type { UserTurnSource } from './conversationOwner.js'
import { recordDebugEvent } from '../services/debugEvidence.js'
import { revealExecutionReceiptInWorkbench, revealReceiptInWorkbench } from '../state/receiptOwnership.js'
import { copyReceiptSummary, replayRunFromReceipt } from '../state/executionReplay.js'
import { openRunsFolderOwned } from './utilityOwnership.js'
import { loadExecutionReceipt } from '../../workbench/runBlocks/receiptPersistence.js'

export function createRunActionHandler(
  store: WorkbenchStore,
  deps: Pick<
    WorkbenchActionControllerDeps,
    | 'trackRendererEvent'
    | 'buildInterruptedRunRecoveryPrompt'
    | 'normalizePlanSteps'
    | 'commitStartedExecutionResult'
    | 'buildExecutionHaltContent'
    | 'getWorkspaceKey'
  > & { submitUserTurn: (prompt: string, source: UserTurnSource) => Promise<boolean> }
): (target: HTMLElement) => Promise<boolean> {
  return async (target: HTMLElement): Promise<boolean> => {
    const executePlanBtn = target.closest<HTMLElement>('[data-execute-plan]')
    if (executePlanBtn?.dataset.executePlan) {
      const workspaceRoot = String(executePlanBtn.dataset.executePlanWorkspaceRoot || '').trim()
      const prompt = String(executePlanBtn.dataset.executePlanPrompt || 'Run the reviewed plan.').trim()
      if (!workspaceRoot) {
        store.dispatch({ type: 'ui/setStatusSummary', text: 'Missing workspace root for this plan.' })
        return true
      }
      let parsedPlan: any[] = []
      try {
        parsedPlan = JSON.parse(executePlanBtn.dataset.executePlan)
      } catch {
        store.dispatch({ type: 'ui/setStatusSummary', text: 'This saved plan could not be read.' })
        return true
      }
      const planSteps = deps.normalizePlanSteps(Array.isArray(parsedPlan) ? parsedPlan : [])
      if (planSteps.length === 0) {
        store.dispatch({ type: 'ui/setStatusSummary', text: 'This plan has no runnable steps.' })
        return true
      }
      const hostMessage = executePlanBtn.closest<HTMLElement>('[data-msg-id]')
      const messageId = hostMessage?.dataset.msgId || `rina:plan-run:${Date.now()}`
      const result = await window.rina.executePlanStream({
        plan: planSteps,
        projectRoot: workspaceRoot,
        confirmed: false,
        confirmationText: '',
      })
      if (
        deps.commitStartedExecutionResult(
          store,
          {
            messageId,
            prompt,
            workspaceRoot,
            planSteps,
          },
          result || {}
        )
      ) {
        return true
      }
      store.dispatch({
        type: 'chat/add',
        msg: {
          id: `rina:plan-run-error:${Date.now()}`,
          role: 'rina',
          content: deps.buildExecutionHaltContent(prompt, result?.error || result?.haltReason || 'The reviewed plan did not start.'),
          ts: Date.now(),
          workspaceKey: deps.getWorkspaceKey(),
        },
      })
      return true
    }

    const toggleRunOutputBtn = target.closest<HTMLElement>('[data-run-toggle-output]')
    if (toggleRunOutputBtn?.dataset.runToggleOutput) {
      const runId = toggleRunOutputBtn.dataset.runToggleOutput
      recordDebugEvent('ui', 'run.output.toggle', { runId })
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
      recordDebugEvent('ui', 'receipt.open', { receiptId })
      if (receiptId) {
        const result = await window.rina.revealRunReceipt(receiptId)
        if (result.ok && result.receipt) {
          revealReceiptInWorkbench(store, result.receipt)
        } else {
          const localReceipt = store.getState().executionReceiptsByRunId[receiptId] || loadExecutionReceipt(receiptId)
          if (localReceipt) {
            revealExecutionReceiptInWorkbench(store, localReceipt)
          } else {
            store.dispatch({ type: 'ui/setStatusSummary', text: result.error || 'Failed to load receipt' })
          }
        }
      }
      return true
    }

    const runArtifactsBtn = target.closest<HTMLElement>('[data-run-artifacts]')
    if (runArtifactsBtn?.dataset.runArtifacts) {
      const runId = runArtifactsBtn.dataset.runArtifacts
      recordDebugEvent('ui', 'run.artifacts.open', { runId })
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
      await openRunsFolderOwned(store, { source: 'run_actions' })
      return true
    }

    const rerunBtn = target.closest<HTMLElement>('[data-run-rerun]')
    if (rerunBtn?.dataset.runRerun) {
      const run = store.getState().runs.find((entry) => entry.id === rerunBtn.dataset.runRerun)
      recordDebugEvent('ui', 'run.rerun', { runId: rerunBtn.dataset.runRerun })
      if (run?.command) {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        await deps.submitUserTurn(run.command, 'run_rerun')
      }
      return true
    }

    const resumeRunBtn = target.closest<HTMLElement>('[data-run-resume]')
    if (resumeRunBtn?.dataset.runResume) {
      const run = store.getState().runs.find((entry) => entry.id === resumeRunBtn.dataset.runResume)
      recordDebugEvent('ui', 'run.resume', { runId: resumeRunBtn.dataset.runResume })
      if (run?.command) {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        await deps.submitUserTurn(deps.buildInterruptedRunRecoveryPrompt(run), 'run_resume')
      }
      return true
    }

    const fixBtn = target.closest<HTMLElement>('[data-run-fix]')
    if (fixBtn?.dataset.runFix) {
      const run = store.getState().runs.find((entry) => entry.id === fixBtn.dataset.runFix)
      recordDebugEvent('ui', 'run.fix', { runId: fixBtn.dataset.runFix })
      if (run?.command) {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        await deps.submitUserTurn(
          `The run "${run.command}" ${run.status === 'interrupted' ? 'was interrupted' : 'failed'} with exit code ${run.exitCode ?? 'unknown'}. Analyze the receipt and output, then propose a safe fix and retry plan. Do not edit files without approval.`,
          'run_fix'
        )
      }
      return true
    }

    const diffBtn = target.closest<HTMLElement>('[data-run-diff]')
    if (diffBtn?.dataset.runDiff) {
      const run = store.getState().runs.find((entry) => entry.id === diffBtn.dataset.runDiff)
      recordDebugEvent('ui', 'run.diff', { runId: diffBtn.dataset.runDiff })
      if (run?.command) {
        store.dispatch({ type: 'ui/closeDrawer' })
        store.dispatch({ type: 'view/rightSet', view: 'agent' })
        await deps.submitUserTurn(
          `Inspect run ${run.id} for changed files or diff hints from "${run.command}" and summarize what changed.`,
          'run_diff'
        )
      } else {
        store.dispatch({ type: 'ui/setStatusSummary', text: 'Run diff context not available' })
      }
      return true
    }

    const receiptReplayBtn = target.closest<HTMLElement>('[data-receipt-replay]')
    if (receiptReplayBtn?.dataset.receiptReplay) {
      recordDebugEvent('ui', 'receipt.replay', { runId: receiptReplayBtn.dataset.receiptReplay })
      replayRunFromReceipt(store, receiptReplayBtn.dataset.receiptReplay)
      return true
    }

    const receiptViewLogsBtn = target.closest<HTMLElement>('[data-receipt-view-logs]')
    if (receiptViewLogsBtn?.dataset.receiptViewLogs) {
      recordDebugEvent('ui', 'receipt.view_logs', { runId: receiptViewLogsBtn.dataset.receiptViewLogs })
      replayRunFromReceipt(store, receiptViewLogsBtn.dataset.receiptViewLogs)
      return true
    }

    const receiptViewDiffBtn = target.closest<HTMLElement>('[data-receipt-view-diff]')
    if (receiptViewDiffBtn?.dataset.receiptViewDiff) {
      const runId = receiptViewDiffBtn.dataset.receiptViewDiff
      recordDebugEvent('ui', 'receipt.view_diff', { runId })
      store.dispatch({ type: 'view/centerSet', view: 'code' })
      store.dispatch({ type: 'ui/openDrawer', view: 'code' })
      store.dispatch({ type: 'ui/setStatusSummary', text: `Inspecting diff context for run ${runId}` })
      return true
    }

    const receiptCopyBtn = target.closest<HTMLElement>('[data-receipt-copy]')
    if (receiptCopyBtn?.dataset.receiptCopy) {
      const summary = copyReceiptSummary(store, receiptCopyBtn.dataset.receiptCopy)
      if (summary) {
        void navigator.clipboard.writeText(summary)
        store.dispatch({ type: 'ui/setStatusSummary', text: 'Receipt summary copied.' })
      } else {
        store.dispatch({ type: 'ui/setStatusSummary', text: 'Receipt summary unavailable.' })
      }
      return true
    }

    return false
  }
}
