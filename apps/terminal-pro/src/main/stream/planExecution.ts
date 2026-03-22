// @ts-nocheck

import { createPlanExecutionRuntime } from './planExecutionRuntime.js'
import { pipeAgentdSseToRenderer as pipeAgentdSseToRendererImpl } from './planExecutionSse.js'

export function createPlanExecutionHelpers(deps) {
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

  const runningPlanRuns = new Map()
  const streamToPlanRun = new Map()
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
  })
  const {
    newPlanRunId,
    terminalWriteSafetyFields,
    startStreamingStepViaEngine,
    cancelStream,
    hardKillStream,
    executeStepStreamForIpc,
  } = runtime

  async function pipeAgentdSseToRenderer(args) {
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

  async function planStopForIpc(planRunId) {
    const state = runningPlanRuns.get(planRunId)
    if (!state) {
      return { ok: false, message: 'No running plan for that planRunId.' }
    }
    state.stopped = true
    if (state.agentdPlanRunId) {
      try {
        await agentdJson('/v1/cancel', {
          method: 'POST',
          body: { planRunId: state.agentdPlanRunId, reason: 'user' },
          includeLicenseToken: true,
        })
      } catch {}
    }
    if (state.currentStreamId) {
      try {
        await cancelStream(state.currentStreamId)
      } catch {}
    }
    return { ok: true }
  }

  async function streamCancelForIpc(streamId) {
    return cancelStream(streamId)
  }

  async function streamKillForIpc(streamId) {
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
