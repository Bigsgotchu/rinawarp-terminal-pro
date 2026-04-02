import { createPlanExecutionRuntime } from './planExecutionRuntime.js'
import { pipeAgentdSseToRenderer as pipeAgentdSseToRendererImpl } from './planExecutionSse.js'
import type { PlanRunState } from '../ipc/agentExecutionFlow.js'
import type {
  PipeAgentdSseToRendererArgs,
  PlanExecutionHelperDeps,
  PlanExecutionHelpers,
  PlanExecutionStreamControlResult,
  PlanExecutionStreamResult,
  PlanExecutionTerminalSafety,
} from '../startup/runtimeTypes.js'

type PlanExecutionRuntimeResult = {
  newPlanRunId: () => string
  terminalWriteSafetyFields: (stepRisk: unknown) => PlanExecutionTerminalSafety
  startStreamingStepViaEngine: (args: unknown) => Promise<{
    ok: boolean
    cancelled: boolean
    error?: string | null
  }>
  cancelStream: (
    streamId: string,
  ) => Promise<PlanExecutionStreamControlResult>
  hardKillStream: (
    streamId: string,
  ) => Promise<PlanExecutionStreamControlResult>
  executeStepStreamForIpc: (args: unknown) => Promise<PlanExecutionStreamResult>
}

export function createPlanExecutionHelpers(
  deps: PlanExecutionHelperDeps,
): PlanExecutionHelpers {
  const {
    engine,
    executeViaEngine,
    getLicenseTier,
    normalizeProjectRoot,
    resolveProjectRootSafe,
    gateProfileCommand,
    evaluatePolicyGate,
    ensureStructuredSession,
    withStructuredSessionWrite,
    structuredSessionStore,
    safeSend,
    redactChunkIfNeeded,
    forRendererDisplay,
    agentdJson,
    buildAgentdHeaders,
    AGENTD_BASE_URL,
    running,
    ptyStreamOwners,
    closePtyForWebContents,
    createStreamId,
    riskFromPlanStep,
    addTranscriptEntry,
  } = deps

  const runningPlanRuns: PlanExecutionHelpers['runningPlanRuns'] = new Map()
  const streamToPlanRun = new Map<string, string>()
  const runtime = createPlanExecutionRuntime({
    engine,
    executeViaEngine,
    getLicenseTier,
    normalizeProjectRoot,
    resolveProjectRootSafe,
    gateProfileCommand,
    evaluatePolicyGate,
    ensureStructuredSession,
    withStructuredSessionWrite,
    structuredSessionStore,
    safeSend,
    redactChunkIfNeeded,
    forRendererDisplay,
    agentdJson,
    buildAgentdHeaders,
    AGENTD_BASE_URL,
    running,
    ptyStreamOwners,
    closePtyForWebContents,
    createStreamId,
    runningPlanRuns,
    streamToPlanRun,
    addTranscriptEntry,
  }) as PlanExecutionRuntimeResult
  const {
    newPlanRunId,
    terminalWriteSafetyFields,
    startStreamingStepViaEngine,
    cancelStream,
    hardKillStream,
    executeStepStreamForIpc,
  } = runtime

  async function pipeAgentdSseToRenderer(
    args: PipeAgentdSseToRendererArgs,
  ) {
    return pipeAgentdSseToRendererImpl({
      ...args,
      e2ePlanPayloads: deps.e2ePlanPayloads,
      createStreamId,
      streamToPlanRun,
      safeSend,
      riskFromPlanStep,
      startStreamingStepViaEngine,
      AGENTD_BASE_URL,
      buildAgentdHeaders,
      withStructuredSessionWrite,
      structuredSessionStore,
      forRendererDisplay,
      redactChunkIfNeeded,
    })
  }

  async function planStopForIpc(
    planRunId: string,
  ): Promise<PlanExecutionStreamControlResult> {
    const state = runningPlanRuns.get(planRunId)
    if (!state) {
      return { ok: false, message: 'No running plan for that planRunId.' }
    }
    state.stopped = true
    const failures: string[] = []
    if (state.agentdPlanRunId) {
      try {
        await agentdJson('/v1/cancel', {
          method: 'POST',
          body: { planRunId: state.agentdPlanRunId, reason: 'user' },
          includeLicenseToken: true,
        })
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error))
      }
    }
    if (state.currentStreamId) {
      try {
        await cancelStream(state.currentStreamId)
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error))
      }
    }
    return {
      ok: failures.length === 0,
      degraded: failures.length > 0,
      message: failures.length > 0 ? failures.join(' | ') : 'Cancellation requested.',
    }
  }

  async function streamCancelForIpc(
    streamId: string,
  ): Promise<PlanExecutionStreamControlResult> {
    return cancelStream(streamId)
  }

  async function streamKillForIpc(
    streamId: string,
  ): Promise<PlanExecutionStreamControlResult> {
    return hardKillStream(streamId)
  }

  return {
    runningPlanRuns,
    newPlanRunId,
    terminalWriteSafetyFields,
    pipeAgentdSseToRenderer,
    executeStepStreamForIpc,
    streamCancelForIpc,
    streamKillForIpc,
    planStopForIpc,
  }
}
