import type { IpcMain, WebContents } from 'electron'
import { getInstalledAgent } from '../../rina/agent-manager.js'
import { FALLBACK_MARKETPLACE_AGENTS } from '../../rina/capabilities/catalog.js'
import {
  buildCapabilityExecutionPlan,
  buildMarketplaceCapabilityExecutionPlan,
} from '../../rina/capabilities/execution.js'
import { listCapabilityPacks } from '../../rina/capabilities/registry.js'
import { executeSelfCheck } from '../tools/selfCheck.js'

export type PlanRunState = {
  stopped: boolean
  currentStreamId?: string
  agentdPlanRunId?: string
}

export type RiskLevel = 'read' | 'safe-write' | 'high-impact'

export type ExecutePlanPayload = {
  plan: any[]
  projectRoot: string
  confirmed: boolean
  confirmationText: string
}

export type ExecuteCapabilityPayload = {
  packKey: string
  projectRoot: string
  actionId?: string
  confirmed?: boolean
  confirmationText?: string
}

export type RegisterAgentExecutionArgs = {
  ipcMain: IpcMain
  newPlanRunId: () => string
  resolveProjectRootSafe: (input?: string) => string
  ensureStructuredSession: (args: { source: string; projectRoot: string; preferredId?: string }) => void
  runningPlanRuns: Map<string, PlanRunState>
  safeSend: (target: WebContents | null | undefined, channel: string, payload?: unknown) => boolean
  riskFromPlanStep: (step: any) => RiskLevel
  gateProfileCommand: (args: {
    projectRoot: string
    command: string
    risk: RiskLevel
    confirmed: boolean
    confirmationText: string
  }) => { ok: true } | { ok: false; message: string }
  evaluatePolicyGate: (
    command: string,
    confirmed: boolean,
    confirmationText: string
  ) => { ok: boolean; message?: string }
  executeRemotePlan: (payload: {
    plan: any[]
    projectRoot: string
    confirmed: boolean
    confirmationText: string
  }) => Promise<{ ok: true; planRunId: string }>
  pipeAgentdSseToRenderer: (args: {
    eventSender: WebContents
    localPlanRunId: string
    agentdPlanRunId: string
    runId: string
  }) => Promise<string | undefined>
  createStreamId: () => string
  streamCancel: (streamId: string) => Promise<unknown>
  streamKill: (streamId: string) => Promise<unknown>
  planStop: (planRunId: string) => Promise<unknown>
}

export function logDeprecatedExecutionChannelUsage(channel: string, replacement: string): void {
  console.warn(`[IPC] Deprecated execution channel used: ${channel}. Use ${replacement} instead.`)
}

function getHaltFromPreflight(args: RegisterAgentExecutionArgs, payload: ExecutePlanPayload, projectRoot: string) {
  for (const rawStep of payload.plan || []) {
    const command = rawStep?.input?.command
    if (typeof command !== 'string') continue
    const risk = args.riskFromPlanStep(rawStep)
    const effectiveConfirmed = payload.confirmed || risk === 'read'
    const profileGate = args.gateProfileCommand({
      projectRoot,
      command,
      risk,
      confirmed: effectiveConfirmed,
      confirmationText: payload.confirmationText ?? '',
    })
    if (!profileGate.ok) {
      return {
        haltedStepId: rawStep?.stepId ?? null,
        haltReason: (profileGate as { message: string }).message,
      }
    }
    const policyGate = args.evaluatePolicyGate(command, effectiveConfirmed, payload.confirmationText ?? '')
    if (!policyGate.ok) {
      return {
        haltedStepId: rawStep?.stepId ?? null,
        haltReason: policyGate.message || 'Blocked by policy.',
      }
    }
  }
  return null
}

async function runRemotePlan(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  planRunId: string,
  runId: string,
  payload: ExecutePlanPayload,
  projectRoot: string
): Promise<string> {
  const execResp = await args.executeRemotePlan({
    plan: payload.plan,
    projectRoot,
    confirmed: payload.confirmed,
    confirmationText: payload.confirmationText ?? '',
  })
  const state = args.runningPlanRuns.get(planRunId)
  if (state) state.agentdPlanRunId = execResp.planRunId
  return (
    (await args.pipeAgentdSseToRenderer({
      eventSender,
      localPlanRunId: planRunId,
      agentdPlanRunId: execResp.planRunId,
      runId,
    })) || ''
  )
}

function isLocalSelfCheckPlan(payload: ExecutePlanPayload): boolean {
  const steps = Array.isArray(payload.plan) ? payload.plan : []
  if (steps.length !== 1) return false
  const step = steps[0]
  const tool = String(step?.tool || '').trim().toLowerCase()
  const command = String(step?.input?.command || '').trim()
  return tool === 'selfcheck' || command === 'executeSelfCheck'
}

async function runLocalSelfCheck(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  planRunId: string,
  projectRoot: string
) {
  const streamId = `stream_${Date.now()}_${Math.random().toString(16).slice(2)}`
  args.safeSend(eventSender, 'rina:plan:stepStart', {
    planRunId,
    runId: streamId,
    streamId,
    stepId: 's1',
    tool: 'selfCheck',
    input: {
      command: 'executeSelfCheck',
      cwd: projectRoot,
      timeoutMs: 60_000,
    },
  })
  const result = await executeSelfCheck(projectRoot, {
    workspaceRoot: projectRoot,
    sessionId: planRunId,
    lastRunId: null,
  })
  args.safeSend(eventSender, 'rina:stream:chunk', {
    streamId,
    stream: 'meta',
    data: `${result.findings}\n`,
  })
  args.safeSend(eventSender, 'rina:stream:end', {
    streamId,
    ok: result.run.exitCode === 0,
    code: result.run.exitCode,
    cancelled: false,
    error: result.run.exitCode === 0 ? null : 'Self-check found issues that need attention.',
  })
  return {
    ok: result.run.exitCode === 0,
    runId: streamId,
    planRunId,
    haltedStepId: result.run.exitCode === 0 ? null : 's1',
    haltReason: result.run.exitCode === 0 ? '' : 'Self-check found issues that need attention.',
    error: result.run.exitCode === 0 ? undefined : 'Self-check found issues that need attention.',
    code: result.run.exitCode === 0 ? undefined : 'RUN_FAILED',
  }
}

export async function handleExecutePlanStream(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  payload: ExecutePlanPayload
) {
  const planRunId = args.newPlanRunId()
  const runId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`
  if (!payload.projectRoot) {
    return {
      ok: false,
      runId,
      planRunId,
      haltedStepId: payload.plan[0]?.stepId ?? null,
      haltReason: 'Missing projectRoot for executePlanStream',
      error: 'Missing projectRoot for executePlanStream',
      code: 'MISSING_PROJECT_ROOT',
    }
  }
  const projectRoot = args.resolveProjectRootSafe(payload.projectRoot)
  args.ensureStructuredSession({ source: 'execute_plan_stream', projectRoot, preferredId: planRunId })
  args.runningPlanRuns.set(planRunId, { stopped: false })
  args.safeSend(eventSender, 'rina:plan:run:start', { planRunId })

  if (isLocalSelfCheckPlan(payload)) {
    try {
      const result = await runLocalSelfCheck(args, eventSender, planRunId, projectRoot)
      args.safeSend(eventSender, 'rina:plan:run:end', {
        planRunId,
        ok: result.ok,
        haltedBecause: result.haltReason || undefined,
      })
      return result
    } finally {
      args.runningPlanRuns.delete(planRunId)
    }
  }

  const preflightHalt = getHaltFromPreflight(args, payload, projectRoot)
  if (preflightHalt) {
    args.safeSend(eventSender, 'rina:plan:run:end', {
      planRunId,
      ok: false,
      haltedBecause: preflightHalt.haltReason,
    })
    args.runningPlanRuns.delete(planRunId)
    return {
      ok: false,
      runId,
      planRunId,
      haltedStepId: preflightHalt.haltedStepId,
      haltReason: preflightHalt.haltReason,
      error: preflightHalt.haltReason,
      code: 'PLAN_HALTED',
    }
  }

  let haltedStepId: string | null = null
  let haltReason = ''
  let failureCode: 'RUN_FAILED' | 'EXEC_BACKEND_UNAVAILABLE' | null = null
  try {
    haltReason = await runRemotePlan(args, eventSender, planRunId, runId, payload, projectRoot)
    if (haltReason) {
      failureCode = 'RUN_FAILED'
    }
  } catch (error) {
    haltedStepId = payload.plan[0]?.stepId ?? null
    const message = error instanceof Error ? error.message : String(error)
    haltReason =
      'Execution backend unavailable. No fallback execution was performed. ' +
      `Check connectivity/config and retry. (${message})`
    failureCode = 'EXEC_BACKEND_UNAVAILABLE'
  } finally {
    args.safeSend(eventSender, 'rina:plan:run:end', {
      planRunId,
      ok: !haltReason,
      haltedBecause: haltReason || undefined,
    })
    args.runningPlanRuns.delete(planRunId)
  }
  if (haltReason) {
    return {
      ok: false,
      runId,
      planRunId,
      haltedStepId,
      haltReason,
      error: haltReason,
      code: failureCode || 'RUN_FAILED',
      retrySuggestion:
        failureCode === 'EXEC_BACKEND_UNAVAILABLE'
          ? 'Retry after the execution backend is healthy again.'
          : undefined,
    }
  }

  return { ok: true, runId, planRunId, haltedStepId, haltReason: '' }
}

function resolveCapabilityPlan(payload: ExecuteCapabilityPayload, projectRoot: string) {
  const pack = listCapabilityPacks(FALLBACK_MARKETPLACE_AGENTS).find((entry) => entry.key === payload.packKey)
  if (!pack) {
    return {
      ok: false as const,
      error: 'Capability not found',
      code: 'CAPABILITY_NOT_FOUND',
    }
  }

  const builtinPlan = buildCapabilityExecutionPlan(pack, projectRoot, payload.actionId)
  if (builtinPlan) {
    return {
      ok: true as const,
      pack,
      plan: builtinPlan,
    }
  }

  const installed = getInstalledAgent(pack.key)
  if (installed) {
    const marketplacePlan = buildMarketplaceCapabilityExecutionPlan(pack, installed, projectRoot, payload.actionId)
    if (marketplacePlan) {
      return {
        ok: true as const,
        pack,
        plan: marketplacePlan,
      }
    }
  }

  return {
    ok: false as const,
    error: 'Capability action not wired yet',
    code: 'CAPABILITY_NOT_WIRED',
  }
}

export async function handleExecuteCapability(
  args: RegisterAgentExecutionArgs,
  eventSender: WebContents,
  payload: ExecuteCapabilityPayload
) {
  if (!payload.projectRoot) {
    return {
      ok: false,
      error: 'Missing projectRoot for capability execution',
      code: 'MISSING_PROJECT_ROOT',
    }
  }

  const projectRoot = args.resolveProjectRootSafe(payload.projectRoot)
  const resolved = resolveCapabilityPlan(payload, projectRoot)
  if (!resolved.ok) {
    return resolved
  }

  const result = await handleExecutePlanStream(args, eventSender, {
    plan: resolved.plan.steps,
    projectRoot,
    confirmed: payload.confirmed === true,
    confirmationText: payload.confirmationText ?? '',
  })

  return {
    ...result,
    packKey: resolved.pack.key,
    actionId: resolved.plan.actionId,
    prompt: resolved.plan.prompt,
    reasoning: resolved.plan.reasoning,
    plan: resolved.plan.steps,
  }
}
