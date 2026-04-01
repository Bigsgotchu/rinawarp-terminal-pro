// @ts-nocheck

export function errorOnly(error) {
  return {
    ok: false,
    error,
  }
}

export function daemonStatusFallback(error) {
  return {
    ok: false,
    error,
    daemon: { running: false, pid: null, storeDir: null },
    tasks: { total: 0, counts: {} },
  }
}

export function daemonTasksFallback(error) {
  return {
    ok: false,
    error,
    tasks: [],
  }
}

export function graphFallback(error) {
  return {
    ok: false,
    error,
    graph: { nodes: [], edges: [] },
  }
}

export function webhookAuditDenied() {
  return {
    ok: false,
    error: 'Only owner/operator can access webhook audit events.',
    entries: [],
    count: 0,
  }
}

export function webhookAuditFallback(error) {
  return {
    ok: false,
    error,
    entries: [],
    count: 0,
  }
}

export function accountPlanFallback(error) {
  return {
    ok: false,
    degraded: true,
    error,
    status: 'unknown',
    plan: 'unknown',
    seats_allowed: null,
    seats_used: null,
  }
}

export function invitesFallback(error) {
  return {
    ok: false,
    error,
    invites: [],
  }
}

export function auditEntriesFallback(error) {
  return {
    ok: false,
    error,
    entries: [],
  }
}

export function buildE2EPlan(makePlan, payload, terminalWriteSafetyFields) {
  const localPlan = makePlan(payload.intentText, payload.projectRoot)

  return {
    id: localPlan.id,
    reasoning: localPlan.reasoning,
    steps: localPlan.steps.map((step) => ({
      stepId: step.id,
      tool: 'terminal.write',
      input: {
        command: step.command,
        cwd: payload.projectRoot,
        timeoutMs: 60_000,
      },
      ...terminalWriteSafetyFields(step.risk),
      description: step.description ?? step.command,
      verification_plan: { steps: [] },
    })),
  }
}

export function buildE2EPlanExecutionResult(e2ePlanPayloads, payload) {
  const planRunId = `e2e_plan_${Date.now()}_${Math.random().toString(16).slice(2)}`
  e2ePlanPayloads.set(planRunId, payload)

  return {
    ok: true,
    planRunId,
  }
}
