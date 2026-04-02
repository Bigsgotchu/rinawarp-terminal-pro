import { bubbleBlock } from '../replies/renderFragments.js'
import type { FixPlanResponse, FixPlanStep, PlanCapabilityRequirement } from '../replies/renderPlanReplies.js'
import type { RinaReplyResult } from '../replies/renderRinaReply.js'
import { type WorkbenchStore, type WorkbenchState, type MessageBlock } from '../workbench/store.js'
import type { FixProjectResult } from '../../main/assistant/fixProjectFlow.js'

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

type ConversationRouteResult = {
  mode:
    | 'chat'
    | 'help'
    | 'question'
    | 'inspect'
    | 'execute'
    | 'self_check'
    | 'follow_up'
    | 'recovery'
    | 'settings'
    | 'memory_update'
    | 'unclear'
  allowedNextAction: 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'
}

type AgentExecutionFlowDeps = {
  getWorkspaceKey: (store: WorkbenchStore) => string
  getAgentWorkspaceRoot: (store: WorkbenchStore) => string | null
  trackRendererFunnel: (step: 'first_run' | 'first_block', properties?: Record<string, unknown>) => Promise<void>
  matchPromptCapability: (prompt: string) => { key: string; reason: string } | null
  resolvePromptCapability: (
    state: WorkbenchState,
    prompt: string
  ) =>
    | { state: 'ready' | 'locked' | 'install'; pack: WorkbenchState['capabilities']['packs'][number]; reason: string }
    | null
  refreshCapabilityPacks: (store: WorkbenchStore) => Promise<void>
  isExecutionPrompt: (prompt: string) => boolean
  normalizePlanSteps: (steps: FixPlanStep[]) => FixPlanStep[]
  resolvePlanCapabilityRequirements: (state: WorkbenchState, steps: FixPlanStep[]) => PlanCapabilityRequirement[]
  buildExecutionPlanContent: (
    prompt: string,
    plan: FixPlanResponse,
    requirements: PlanCapabilityRequirement[],
    options?: { introText?: string; reviewOnly?: boolean; planActionPrompt?: string; workspaceRoot?: string }
  ) => MessageBlock[]
  buildCapabilityDecisionContent: (
    decision: NonNullable<ReturnType<AgentExecutionFlowDeps['resolvePromptCapability']>>
  ) => MessageBlock[]
  buildExecutionHaltContent: (prompt: string, reason: string, options?: { introText?: string }) => MessageBlock[]
  buildRinaReplyContent: (result: RinaReplyResult, options?: { leadText?: string | null }) => MessageBlock[]
  composeRinaReplyLead: (args: { result: RinaReplyResult; memoryState?: any }) => string | null
  composeExecutionPlanLead: (args: { prompt: string; stepCount: number; requiresCapabilities?: boolean; memoryState?: any }) => string
  composePlanModeLead: (args: { prompt: string; stepCount: number; requiresCapabilities?: boolean; memoryState?: any }) => string
  composeCapabilityLead: (args: {
    state: 'ready' | 'locked' | 'install'
    title: string
    reason: string
    memoryState?: any
  }) => string
  composeExecutionHaltLead: (args: { prompt: string; reason?: string; memoryState?: any }) => string
  didExecutionStart: (result: { runId?: string; code?: string; ok?: boolean } | null | undefined) => boolean
}

export function createAgentExecutionFlow(deps: AgentExecutionFlowDeps) {
  const rina = window.rina as any

  const commitStartedExecutionResult = (
    store: WorkbenchStore,
    args: {
      messageId: string
      prompt: string
      workspaceRoot: string
      planSteps: FixPlanStep[]
      title?: string
      command?: string
    },
    execResult: {
      ok?: boolean
      runId?: string
      planRunId?: string
    }
  ): boolean => {
    const runStarted = deps.didExecutionStart(execResult)
    if (!runStarted || !execResult.runId) return false
    store.dispatch({ type: 'chat/linkRun', messageId: args.messageId, runId: execResult.runId })
    store.dispatch({
      type: 'runs/upsert',
      run: {
        id: execResult.runId,
        sessionId: execResult.planRunId || execResult.runId,
        title: args.title || args.prompt,
        command: args.command || args.planSteps.map((step) => String(step.input?.command || '')).filter(Boolean).join(' && ') || args.prompt,
        cwd: args.workspaceRoot,
        status: 'running',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        endedAt: null,
        exitCode: null,
        commandCount: args.planSteps.length,
        failedCount: 0,
        latestReceiptId: execResult.runId,
        originMessageId: args.messageId,
      },
    })
    return true
  }

  const startPlannedExecution = async (
    store: WorkbenchStore,
    args: {
      prompt: string
      workspaceKey: string
      workspaceRoot: string
      plan: FixPlanResponse
      planSteps: FixPlanStep[]
      capabilityRequirements?: PlanCapabilityRequirement[]
      memoryState?: any
      reviewOnly?: boolean
    }
  ): Promise<boolean> => {
    const messageId = `rina:plan:${Date.now()}`
    const introText = (args.reviewOnly ? deps.composePlanModeLead : deps.composeExecutionPlanLead)({
      prompt: args.prompt,
      stepCount: args.planSteps.length,
      requiresCapabilities: (args.capabilityRequirements || []).length > 0,
      memoryState: args.memoryState,
    })
    store.dispatch({
      type: 'chat/add',
      msg: {
        id: messageId,
        role: 'rina',
        content: deps.buildExecutionPlanContent(args.prompt, args.plan, args.capabilityRequirements || [], {
          introText,
          reviewOnly: args.reviewOnly,
          planActionPrompt: args.prompt,
          workspaceRoot: args.workspaceRoot,
        }),
        ts: Date.now(),
        workspaceKey: args.workspaceKey,
      },
    })

    if (args.reviewOnly) {
      return false
    }

    if ((args.capabilityRequirements || []).some((requirement) => requirement.state !== 'ready')) {
      return false
    }

    const execResult = (await rina.executePlanStream({
      plan: args.planSteps,
      projectRoot: args.workspaceRoot,
      confirmed: false,
      confirmationText: '',
    })) as ExecutionResult

    if (
      commitStartedExecutionResult(
        store,
        { messageId, prompt: args.prompt, workspaceRoot: args.workspaceRoot, planSteps: args.planSteps },
        execResult || {}
      )
    ) {
      return true
    }

    store.dispatch({
      type: 'chat/add',
      msg: {
        id: `rina:plan-error:${Date.now()}`,
        role: 'rina',
        content: deps.buildExecutionHaltContent(args.prompt, execResult?.error || execResult?.haltReason || 'The run did not start.', {
          introText: deps.composeExecutionHaltLead({
            prompt: args.prompt,
            reason: execResult?.error || execResult?.haltReason || 'The run did not start.',
            memoryState: args.memoryState,
          }),
        }),
        ts: Date.now(),
        workspaceKey: args.workspaceKey,
      },
    })
    return false
  }

  const sendPromptToRina = async (store: WorkbenchStore, prompt: string): Promise<void> => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    const now = Date.now()
    const workspaceKey = deps.getWorkspaceKey(store)
    const workspaceRoot = deps.getAgentWorkspaceRoot(store)
    store.dispatch({
      type: 'chat/add',
      msg: {
        id: `user:${now}`,
        role: 'user',
        content: [bubbleBlock(trimmed)],
        ts: now,
        workspaceKey,
      },
    })
    store.dispatch({
      type: 'thinking/set',
      active: true,
      message: 'Rina is tracing through it…',
      stream: '',
    })

    void deps.trackRendererFunnel('first_run', {
      entry_surface: 'agent_thread',
      workspace_key: workspaceKey,
    })

    try {
      const memoryState = typeof rina.memoryGetState === 'function' ? await rina.memoryGetState().catch(() => null) : null
      const routedTurn = (typeof rina.conversationRoute === 'function'
        ? await rina.conversationRoute(trimmed, { workspaceRoot })
        : null) as ConversationRouteResult | null
      const executionAllowed =
        !routedTurn ||
        routedTurn?.allowedNextAction === 'execute' || routedTurn?.allowedNextAction === 'plan'
      let capabilityDecision = null as ReturnType<AgentExecutionFlowDeps['resolvePromptCapability']>
      if (executionAllowed) {
        const promptCapabilityMatch = deps.matchPromptCapability(trimmed)
        capabilityDecision = deps.resolvePromptCapability(store.getState(), trimmed)
        if (promptCapabilityMatch && typeof rina.capabilityPacks === 'function' && (!capabilityDecision || capabilityDecision.state !== 'ready')) {
          await deps.refreshCapabilityPacks(store)
          capabilityDecision = deps.resolvePromptCapability(store.getState(), trimmed)
        }
        if (capabilityDecision) {
          const resolvedDecision = capabilityDecision
          store.dispatch({
            type: 'chat/add',
            msg: {
              id: `rina:capability:${Date.now()}`,
              role: 'rina',
              content: deps.buildCapabilityDecisionContent(resolvedDecision).map((block, index) =>
                index === 0 && block.type === 'bubble'
                  ? bubbleBlock(
                      deps.composeCapabilityLead({
                        state: resolvedDecision.state,
                        title: resolvedDecision.pack.title,
                        reason: resolvedDecision.reason,
                        memoryState,
                      })
                    )
                  : block
              ),
              ts: Date.now(),
              workspaceKey,
            },
          })

          if (resolvedDecision.state !== 'ready') {
            return
          }
        }
      }

      if (workspaceRoot && deps.isExecutionPrompt(trimmed) && executionAllowed) {
        const plan = (await rina.agentPlan({
          intentText: trimmed,
          projectRoot: workspaceRoot,
        })) as FixPlanResponse
        const planSteps = Array.isArray(plan?.steps) ? plan.steps : []

        if (planSteps.length > 0) {
          const normalizedPlanSteps = deps.normalizePlanSteps(planSteps)
          const planCapabilityRequirements = deps.resolvePlanCapabilityRequirements(store.getState(), normalizedPlanSteps)
          await startPlannedExecution(store, {
            prompt: trimmed,
            workspaceKey,
            workspaceRoot,
            plan,
            planSteps: normalizedPlanSteps,
            capabilityRequirements: planCapabilityRequirements,
            memoryState,
            reviewOnly: routedTurn?.allowedNextAction === 'plan',
          })
          return
        }
      }

      const result = (await rina.runAgent(trimmed, {
        workspaceRoot,
        mode: (store.getState().runtime.mode as 'auto' | 'assist' | 'explain') || 'explain',
      })) as RinaReplyResult

      const leadText = deps.composeRinaReplyLead({ result, memoryState })

      store.dispatch({
        type: 'chat/add',
        msg: {
          id: `rina:${Date.now()}`,
          role: 'rina',
          content: deps.buildRinaReplyContent(result, { leadText }),
          ts: Date.now(),
          workspaceKey,
        },
      })
    } catch (error) {
      store.dispatch({
        type: 'chat/add',
        msg: {
          id: `rina:error:${Date.now()}`,
          role: 'rina',
          content: [bubbleBlock(error instanceof Error ? error.message : String(error))],
          ts: Date.now(),
          workspaceKey,
        },
      })
    } finally {
      store.dispatch({
        type: 'thinking/set',
        active: false,
        message: '',
        stream: '',
      })
    }
  }

  const startFixProjectFlow = async (
    store: WorkbenchStore,
    args: {
      workspaceRoot: string
      workspaceKey: string
      mountPendingFixBlock: (projectRoot: string) => string
      mountFixBlock: (result: FixProjectResult, projectRoot: string, fixId?: string) => string
    }
  ): Promise<boolean> => {
    const pendingFixId = args.mountPendingFixBlock(args.workspaceRoot)

    store.dispatch({
      type: 'chat/add',
      msg: {
        id: `rina:fix-project-start:${Date.now()}`,
        role: 'rina',
        content: [bubbleBlock('Analyzing your project now. I’m scanning the workspace, selecting the safest repair steps, and preparing a proof-backed run. No files change until the plan is ready.')],
        ts: Date.now(),
        workspaceKey: args.workspaceKey,
      },
    })

    const fixResult = (await rina.fixProject(args.workspaceRoot)) as FixProjectResult

    if (!fixResult.success || !Array.isArray(fixResult.executableSteps) || fixResult.executableSteps.length === 0) {
      const pendingFix = store.getState().fixBlocks.find((entry) => entry.id === pendingFixId)
      if (pendingFix) {
        store.dispatch({
          type: 'fix/upsert',
          fix: {
            ...pendingFix,
            status: 'error',
            phase: 'error',
            statusText: 'Automatic repair could not prepare a safe plan.',
            verificationStatus: 'failed',
            verificationText: fixResult.explanation || fixResult.haltReason || 'No safe executable repair steps were available.',
            error: fixResult.haltReason || undefined,
          },
        })
      }
      store.dispatch({
        type: 'chat/add',
        msg: {
          id: `rina:fix-project-halt:${Date.now()}`,
          role: 'rina',
          content: [bubbleBlock(fixResult.explanation || fixResult.haltReason || 'Rina could not prepare a safe repair plan.')],
          ts: Date.now(),
          workspaceKey: args.workspaceKey,
        },
      })
      return false
    }

    const fixId = args.mountFixBlock(fixResult, args.workspaceRoot, pendingFixId)
    const planSteps = deps.normalizePlanSteps(
      fixResult.executableSteps.map((step) => ({
        stepId: step.id,
        tool: 'terminal.write',
        input: {
          command: step.command,
          cwd: args.workspaceRoot,
          timeoutMs: 60_000,
        },
        risk: step.risk,
        description: step.description || step.command,
      }))
    )

    const execResult = (await rina.executePlanStream({
      plan: planSteps,
      projectRoot: args.workspaceRoot,
      confirmed: false,
      confirmationText: '',
    })) as ExecutionResult

    if (deps.didExecutionStart(execResult) && execResult.runId) {
      const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
      if (fix) {
        store.dispatch({
          type: 'fix/upsert',
          fix: {
            ...fix,
            applyRunId: execResult.runId,
            applyPlanRunId: execResult.planRunId,
            status: 'running',
            phase: 'executing',
            statusText: 'Executing the repair plan and streaming terminal proof live…',
            error: undefined,
          },
        })
      }
      return true
    }

    const fix = store.getState().fixBlocks.find((entry) => entry.id === fixId)
    if (fix) {
      store.dispatch({
        type: 'fix/upsert',
        fix: {
          ...fix,
          status: 'error',
          phase: 'error',
          statusText: 'Repair run did not start.',
          error: execResult?.error || execResult?.haltReason || 'The repair run did not start.',
        },
      })
    }
    return false
  }

  return {
    commitStartedExecutionResult,
    startPlannedExecution,
    startFixProjectFlow,
    sendPromptToRina,
  }
}
