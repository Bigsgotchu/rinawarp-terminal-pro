import { bubbleBlock } from '../replies/renderFragments.js'
import type { FixPlanResponse, FixPlanStep, PlanCapabilityRequirement } from '../replies/renderPlanReplies.js'
import type { RinaReplyResult } from '../replies/renderRinaReply.js'
import { type WorkbenchStore, type WorkbenchState, type MessageBlock } from '../workbench/store.js'

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
    | 'question'
    | 'inspect'
    | 'execute'
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
    options?: { introText?: string }
  ) => MessageBlock[]
  buildCapabilityDecisionContent: (
    decision: NonNullable<ReturnType<AgentExecutionFlowDeps['resolvePromptCapability']>>
  ) => MessageBlock[]
  buildExecutionHaltContent: (prompt: string, reason: string, options?: { introText?: string }) => MessageBlock[]
  buildRinaReplyContent: (result: RinaReplyResult, options?: { leadText?: string | null }) => MessageBlock[]
  composeRinaReplyLead: (args: { result: RinaReplyResult; memoryState?: any }) => string | null
  composeExecutionPlanLead: (args: { prompt: string; stepCount: number; requiresCapabilities?: boolean; memoryState?: any }) => string
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
    }
  ): Promise<boolean> => {
    const messageId = `rina:plan:${Date.now()}`
    const introText = deps.composeExecutionPlanLead({
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
        content: deps.buildExecutionPlanContent(args.prompt, args.plan, args.capabilityRequirements || [], { introText }),
        ts: Date.now(),
        workspaceKey: args.workspaceKey,
      },
    })

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

  return {
    commitStartedExecutionResult,
    startPlannedExecution,
    sendPromptToRina,
  }
}
