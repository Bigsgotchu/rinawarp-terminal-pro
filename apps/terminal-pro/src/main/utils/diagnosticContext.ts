import type { WorkbenchState } from '../../renderer/workbench/store.js'

/**
 * Unified resolver for diagnostic context (self-check policy).
 * Prioritizes: active workspace > current session/thread > last run.
 * Accepts either routing args (partial context) or full WorkbenchState.
 */
export function resolveDiagnosticContext(input: {workspaceRoot?: string | null, sessionId?: string | null, lastRunId?: string | null} | WorkbenchState): {
  workspaceRoot: string | null
  sessionId: string | null
  lastRunId: string | null
} {
  let workspaceRoot: string | null = null
  let sessionId: string | null = null
  let lastRunId: string | null = null

  if ('workspaceKey' in input) {
    // Full WorkbenchState
    const state = input as WorkbenchState
    const lastRun =
      [...state.runs].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] || null
    workspaceRoot = state.workspaceKey || null
    sessionId = lastRun?.sessionId || null
    lastRunId = lastRun?.id || null
  } else {
    // Partial routing args
    const args = input as {workspaceRoot?: string | null, sessionId?: string | null, lastRunId?: string | null}
    workspaceRoot = args.workspaceRoot || null
    sessionId = args.sessionId || null
    lastRunId = args.lastRunId || null
  }

  return { workspaceRoot, sessionId, lastRunId }
}

/**
 * Determines if clarifying question is needed per policy (no usable context).
 */
export function shouldAskClarifyingQuestion(ctx: {
  workspaceRoot: string | null
  sessionId: string | null
  lastRunId: string | null
}): boolean {
  return !ctx.workspaceRoot && !ctx.sessionId && !ctx.lastRunId
}
