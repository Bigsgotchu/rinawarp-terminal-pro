import type { RiskLevel } from '../ipc/agentExecutionFlow.js'
import type { SafeSendFn } from '../startup/runtimeTypes.js'

type StructuredSessionStoreLike = {
  beginCommand(args: Record<string, unknown>): void
  appendChunk(streamId: string, stream: string, data: string): void
  endCommand(args: Record<string, unknown>): void
}

type E2ePlanPayload = {
  plan?: Array<{
    stepId?: string
    description?: string
    input?: {
      command?: string
      cwd?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }>
  confirmed: boolean
  confirmationText: string
  projectRoot: string
}

type StartStreamingStepResult = {
  ok: boolean
  cancelled: boolean
  error?: string | null
}

type SsePlanStepPayload = {
  stepId?: string
  id?: string
  input?: {
    command?: string
    cwd?: string
    [key: string]: unknown
  }
  risk_level?: string
  risk?: string
}

type SseReport = {
  haltedBecause?: string
  steps?: Array<{
    result?: {
      error?: string
      meta?: {
        exitCode?: number | null
      }
    }
  }>
}

type SsePayload = {
  streamId?: string
  stream?: string
  data?: unknown
  ok?: boolean
  reason?: string
  report?: SseReport
  step?: SsePlanStepPayload
}

type PipeAgentdSseToRendererDeps = {
  eventSender: {
    send(channel: string, payload?: unknown): void
    isDestroyed(): boolean
  }
  localPlanRunId: string
  agentdPlanRunId: string
  runId: string
  e2ePlanPayloads: Map<unknown, unknown>
  createStreamId: () => string
  streamToPlanRun: Map<string, string>
  safeSend: SafeSendFn
  riskFromPlanStep: (step: unknown) => RiskLevel
  startStreamingStepViaEngine: (args: {
    webContents: {
      send(channel: string, payload?: unknown): void
      isDestroyed(): boolean
    }
    streamId: string
    step: {
      id: string
      tool: 'terminal'
      command: string
      risk: RiskLevel
      description: string
    }
    confirmed: boolean
    confirmationText: string
    projectRoot: string
  }) => Promise<StartStreamingStepResult>
  AGENTD_BASE_URL: string
  buildAgentdHeaders: (opts?: {
    includeLicenseToken?: boolean
    headers?: Record<string, string>
  }) => Record<string, string>
  withStructuredSessionWrite: (fn: () => void) => void
  structuredSessionStore: () => unknown
  forRendererDisplay: (text: unknown) => string
  redactChunkIfNeeded: (text: unknown) => string
}

export async function pipeAgentdSseToRenderer(
  args: PipeAgentdSseToRendererDeps,
) {
  const {
    eventSender,
    localPlanRunId,
    agentdPlanRunId,
    runId,
    e2ePlanPayloads,
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
  } = args
  const getStructuredSessionStore = () =>
    structuredSessionStore() as StructuredSessionStoreLike | null | undefined

  if (agentdPlanRunId.startsWith('e2e_plan_')) {
    const payload = e2ePlanPayloads.get(agentdPlanRunId) as
      | E2ePlanPayload
      | undefined
    e2ePlanPayloads.delete(agentdPlanRunId)
    if (!payload) return 'missing_e2e_plan_payload'
    for (const rawStep of payload.plan || []) {
      const command = String(rawStep?.input?.command || '').trim()
      if (!command) continue
      const streamId = createStreamId()
      streamToPlanRun.set(streamId, localPlanRunId)
      safeSend(eventSender, 'rina:plan:stepStart', {
        planRunId: localPlanRunId,
        runId,
        streamId,
        step: {
          stepId: rawStep?.stepId ?? streamId,
          tool: 'terminal',
          input: rawStep?.input ?? {},
        },
      })
      const stepRisk = riskFromPlanStep(rawStep)
      const result = await startStreamingStepViaEngine({
        webContents: eventSender,
        streamId,
        step: {
          id: String(rawStep?.stepId || streamId),
          tool: 'terminal',
          command,
          risk: stepRisk,
          description: String(rawStep?.description || command),
        },
        confirmed: payload.confirmed,
        confirmationText: payload.confirmationText,
        projectRoot: payload.projectRoot,
      })
      if (!result.ok) return result.error || 'execution_failed'
    }
    return ''
  }

  const response = await fetch(`${AGENTD_BASE_URL}/v1/stream?planRunId=${encodeURIComponent(agentdPlanRunId)}`, {
    method: 'GET',
    headers: buildAgentdHeaders({ includeLicenseToken: true }),
  })
  if (!response.ok || !response.body) {
    throw new Error(`agentd stream failed (${response.status})`)
  }
  const decoder = new TextDecoder()
  const reader = response.body.getReader()
  let buffer = ''
  let haltedBecause: string | undefined
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    while (true) {
      const sep = buffer.indexOf('\n\n')
      if (sep === -1) break
      const rawEvent = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const lines = rawEvent.split(/\r?\n/)
      let eventName = 'message'
      const dataLines = []
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      }
      const payloadText = dataLines.join('\n')
      const payload = payloadText ? (JSON.parse(payloadText) as SsePayload) : {}
      if (eventName === 'plan_step_start') {
        const streamId = payload.streamId
        if (typeof streamId === 'string') {
          streamToPlanRun.set(streamId, localPlanRunId)
          withStructuredSessionWrite(() => {
            const command = String(payload?.step?.input?.command || '')
            const cwd = String(payload?.step?.input?.cwd || '')
            getStructuredSessionStore()?.beginCommand({
              streamId,
              command,
              cwd: cwd || undefined,
              risk: payload?.step?.risk_level || payload?.step?.risk,
              source: 'plan_stream_agentd',
            })
          })
        }
        safeSend(eventSender, 'rina:plan:stepStart', {
          planRunId: localPlanRunId,
          runId,
          streamId: payload.streamId,
          step: {
            stepId: payload?.step?.stepId ?? payload?.step?.id ?? payload?.streamId,
            tool: 'terminal',
            input: payload?.step?.input ?? {},
          },
        })
        continue
      }
      if (eventName === 'chunk') {
        safeSend(eventSender, 'rina:stream:chunk', {
          streamId: payload.streamId,
          stream: payload.stream,
          data: forRendererDisplay(payload.data),
        })
        const chunkStreamId =
          typeof payload.streamId === 'string' ? payload.streamId : null
        if (chunkStreamId) {
          withStructuredSessionWrite(() => {
            const mapped = payload.stream === 'stderr' ? 'stderr' : payload.stream === 'meta' ? 'meta' : 'stdout'
            getStructuredSessionStore()?.appendChunk(
              chunkStreamId,
              mapped,
              redactChunkIfNeeded(String(payload.data || '')),
            )
          })
        }
        continue
      }
      if (eventName === 'plan_step_end') {
        const report = payload.report
        const lastResult = report?.steps?.[report.steps.length - 1]?.result
        const exitCode = lastResult?.meta?.exitCode ?? null
        const error = payload.ok ? null : report?.haltedBecause || lastResult?.error || 'Execution failed'
        if (typeof payload.streamId === 'string') {
          streamToPlanRun.delete(payload.streamId)
        }
        safeSend(eventSender, 'rina:stream:end', {
          streamId: payload.streamId,
          ok: !!payload.ok,
          code: exitCode,
          cancelled: false,
          error,
          report,
        })
        if (typeof payload.streamId === 'string') {
          withStructuredSessionWrite(() => {
            getStructuredSessionStore()?.endCommand({
              streamId: payload.streamId,
              ok: !!payload.ok,
              code: typeof exitCode === 'number' ? exitCode : null,
              cancelled: false,
              error,
            })
          })
        }
        continue
      }
      if (eventName === 'plan_halt') {
        haltedBecause = payload?.reason || 'halted'
        continue
      }
      if (eventName === 'plan_run_end') {
        for (const [streamId, localPlan] of streamToPlanRun.entries()) {
          if (localPlan === localPlanRunId) streamToPlanRun.delete(streamId)
        }
        return haltedBecause
      }
    }
  }
  return haltedBecause
}
