import { FixBlockManager } from './FixBlockManager.js'
import { type FixPlanStep } from '../replies/renderPlanReplies.js'
import { WorkbenchStore } from '../workbench/store.js'

type ExecutionResult = {
  ok?: boolean
  runId?: string
  planRunId?: string
  haltedStepId?: string | null
  haltReason?: string
  error?: string
  code?: string
  retrySuggestion?: string
}

type FixExecutionDeps = {
  normalizePlanSteps: (plan: FixPlanStep[]) => FixPlanStep[]
  createRunLinkedMessage: (store: WorkbenchStore, args: { command: string; runId: string }) => string
  commitStartedExecutionResult: (
    store: WorkbenchStore,
    context: {
      messageId: string
      prompt: string
      workspaceRoot: string
      planSteps: FixPlanStep[]
      title?: string
      command?: string
    },
    result: ExecutionResult
  ) => boolean
  didExecutionStart: (result: ExecutionResult | null | undefined) => boolean
}

export function createFixExecutionActions(deps: FixExecutionDeps) {
  const runFixStepFromStore = async (store: WorkbenchStore, fixId: string, index: number): Promise<void> => {
    const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
    const step = fix?.steps[index]
    if (!fix || !step) return

    store.dispatch({
      type: 'fix/upsert',
      fix: { ...fix, status: 'running', error: undefined },
    })

    const planSteps = deps.normalizePlanSteps([
      {
        input: { command: step.command, cwd: step.cwd },
        risk: step.risk === 'dangerous' ? 'high-impact' : step.risk === 'moderate' ? 'safe-write' : 'inspect',
      },
    ])

    try {
      const result = (await window.rina.executePlanStream({
        plan: planSteps,
        projectRoot: step.cwd,
        confirmed: false,
        confirmationText: '',
      })) as ExecutionResult

      const runStarted = deps.didExecutionStart(result)
      if (runStarted && result?.runId) {
        const messageId = deps.createRunLinkedMessage(store, { command: step.command, runId: result.runId })
        deps.commitStartedExecutionResult(
          store,
          {
            messageId,
            prompt: step.command,
            workspaceRoot: step.cwd,
            planSteps,
            title: step.title || step.command,
            command: step.command,
          },
          result
        )
        store.dispatch({
          type: 'fix/upsert',
          fix: { ...fix, status: 'running', applyRunId: result.runId, error: undefined },
        })
        return
      }

      store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          error: result?.error || result?.haltReason || `Step ${index + 1} did not start a proof-backed run.`,
        },
      })
    } catch (error) {
      store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          error: `Step ${index + 1} failed to start: ${error instanceof Error ? error.message : String(error)}`,
        },
      })
    }
  }

  const autoApplyFixFromStore = async (
    store: WorkbenchStore,
    fixId: string,
    fixBlockManager: FixBlockManager
  ): Promise<void> => {
    const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
    if (!fix) return

    const isPro = await fixBlockManager.ensureProAccess()
    if (!isPro) {
      store.dispatch({
        type: 'fix/upsert',
        fix: { ...fix, error: 'Upgrade required to auto-apply safe fixes.' },
      })
      return
    }

    const safeSteps = fix.steps.filter((step) => step.risk === 'safe')
    if (safeSteps.length === 0) {
      store.dispatch({
        type: 'fix/upsert',
        fix: { ...fix, status: 'error', error: 'No safe auto-apply steps are available for this fix.' },
      })
      return
    }

    store.dispatch({
      type: 'fix/upsert',
      fix: { ...fix, status: 'running', error: undefined },
    })

    const planSteps = deps.normalizePlanSteps(
      safeSteps.map((step) => ({
        input: { command: step.command, cwd: step.cwd },
        risk: 'safe-write',
      }))
    )

    try {
      const result = (await window.rina.executePlanStream({
        plan: planSteps,
        projectRoot: fix.cwd,
        confirmed: true,
        confirmationText: 'SAFE_FIX',
      })) as ExecutionResult

      const runStarted = deps.didExecutionStart(result)
      if (runStarted && result?.runId) {
        const commandSummary = safeSteps.map((step) => step.command).join(' && ')
        const messageId = deps.createRunLinkedMessage(store, { command: commandSummary, runId: result.runId })
        deps.commitStartedExecutionResult(
          store,
          {
            messageId,
            prompt: commandSummary,
            workspaceRoot: fix.cwd,
            planSteps,
            title: 'Auto-apply safe fix',
            command: commandSummary,
          },
          result
        )
        store.dispatch({
          type: 'fix/upsert',
          fix: { ...fix, status: 'running', applyRunId: result.runId, error: undefined },
        })
        return
      }

      store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          error: result?.error || result?.haltReason || 'Auto-apply did not start a proof-backed run.',
        },
      })
    } catch (error) {
      store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          error: `Auto-apply failed to start: ${error instanceof Error ? error.message : String(error)}`,
        },
      })
    }
  }

  return {
    runFixStepFromStore,
    autoApplyFixFromStore,
  }
}
