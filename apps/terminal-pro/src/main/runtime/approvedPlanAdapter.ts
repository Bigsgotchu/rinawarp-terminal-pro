import type { IpcMain, WebContents } from 'electron'
import type { PlanApprovalMetadata } from '../ipc/agentExecutionFlow.js'

export type ApprovedPlanInput = {
  plan_id: string
  approved_plan: any[]
  approval_timestamp: string
  approval_actor: string
  session_id?: string
  thread_id?: string
}

export type ApprovedPlanExecutionResult = {
  ok: true
  runtime_id: string
  proof_id: string
  structured_run_id?: string
  execution_status: 'started' | 'completed' | 'failed'
}

export type ApprovedPlanRejectionResult = {
  ok: false
  error: string
  proof_id?: string
}

type WebContentsLike = WebContents

export type ApprovedPlanAdapterDeps = {
  executeRemotePlan: (payload: {
    plan: any[]
    projectRoot: string
    confirmed: boolean
    confirmationText: string
    approval?: PlanApprovalMetadata
  }) => Promise<{ ok: true; planRunId: string }>
  pipeAgentdSseToRenderer: (args: {
    eventSender: WebContents
    localPlanRunId: string
    agentdPlanRunId: string
    runId: string
    approval?: PlanApprovalMetadata
  }) => Promise<string | undefined>
  createStreamId: () => string
  newPlanRunId: () => string
  ensureStructuredSession: (args: { source: string; projectRoot: string; preferredId?: string }) => void
  safeSend: (target: WebContents | null | undefined, channel: string, payload?: unknown) => boolean
  resolveProjectRootSafe: (input?: string) => string
}

export function createApprovedPlanAdapter(deps: ApprovedPlanAdapterDeps) {
  return {
    async executeApprovedPlan(
      input: ApprovedPlanInput,
      eventSender: WebContents,
    ): Promise<ApprovedPlanExecutionResult | ApprovedPlanRejectionResult> {
      const {
        plan_id,
        approved_plan,
        approval_timestamp,
        approval_actor,
        session_id,
        thread_id,
      } = input

      if (!approved_plan || !Array.isArray(approved_plan) || approved_plan.length === 0) {
        return { ok: false, error: 'Empty or invalid approved plan', proof_id: `proof:${plan_id || 'unknown'}:rejected` }
      }

      const planRunId = thread_id || deps.newPlanRunId()
      const runId = deps.createStreamId()
      const projectRoot = deps.resolveProjectRootSafe(session_id || '/tmp/test')

      deps.ensureStructuredSession({
        source: 'execute_approved_plan',
        projectRoot,
        preferredId: planRunId,
      })

      deps.safeSend(eventSender, 'rina:plan:run:start', { planRunId })

      const approval: PlanApprovalMetadata = {
        planId: plan_id,
        approvedAt: approval_timestamp,
        actor: approval_actor,
      }

      const execResult = await deps.executeRemotePlan({
        plan: approved_plan,
        projectRoot,
        confirmed: true,
        confirmationText: 'Approved plan execution',
        approval,
      })

      const agentdPlanRunId = execResult.planRunId
      const runtimeId = agentdPlanRunId
      const proofId = `proof:${plan_id}:${runId}`

      await deps.pipeAgentdSseToRenderer({
        eventSender,
        localPlanRunId: planRunId,
        agentdPlanRunId,
        runId,
        approval,
      })

      deps.safeSend(eventSender, 'rina:plan:run:end', {
        planRunId,
        ok: true,
        haltedBecause: undefined,
      })

      return {
        ok: true,
        runtime_id: runtimeId,
        proof_id: proofId,
        structured_run_id: runId,
        execution_status: 'started',
      }
    },
  }
}
