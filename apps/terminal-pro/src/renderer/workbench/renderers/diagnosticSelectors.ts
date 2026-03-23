import type { WorkbenchState } from '../store.js'
import { resolveDiagnosticContext, shouldAskClarifyingQuestion } from '../../../main/utils/diagnosticContext.js'

/**
 * Resolves diagnostic context for self-check policy.
 * Prioritizes: active workspace > current session/thread > last run.
 */
export function resolveDiagnosticContextSelector(state: WorkbenchState): {
  workspaceRoot: string | null
  sessionId: string | null
  lastRunId: string | null
} {
  return resolveDiagnosticContext(state)
}
