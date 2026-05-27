import type { RinaExecutionRecord, RinaIntent } from '@rinawarp/rina-core'
import { buildExecutionRecord } from '@rinawarp/rina-runtime/execution/executionRecord.js'
import type { RuntimeIngressRequest } from '@rinawarp/rina-runtime/ipc/ingress.js'
import {
  createUiAnalyzeIntent,
  submitRinaIntent,
} from '../../main/assistant/rinaIntentLoop.js'

/**
 * RinaRuntimeBridge — LEGACY COMPATIBILITY ADAPTER
 *
 * The ONLY allowed bridge between legacy `src/rina/` and canonical runtime.
 * Legacy code calls THIS module; execution flows through handleIngress.
 *
 * MAY: convert legacy shapes → RinaIntent, forward ingress, map records
 * MAY NOT: call LLMs, run CLI, plan, or embed product logic
 */

export type LegacyPlannerOutput = {
  steps: Array<{ tool: string; action: string; description?: string }>
  explanation?: string
  requiresApproval?: boolean
}

export type LegacyExplainRequest = {
  errorText: string
  context?: string
}

export function executionRecordToLegacyText(record: RinaExecutionRecord): string {
  const explanation = record.outcome?.explanation?.trim()
  if (explanation) return explanation

  const failed = record.events.find((event) => event.type === 'execution.failed')
  if (failed && failed.type === 'execution.failed' && failed.error) {
    return `Execution failed: ${failed.error}`
  }

  return 'Request forwarded to canonical runtime. Open the agent thread for full results.'
}

/**
 * Single ingress forwarder for legacy adapters.
 */
export async function submitLegacyIntentToRuntime(
  intent: RinaIntent,
  projectRoot: string,
  context?: RuntimeIngressRequest['context'],
): Promise<RinaExecutionRecord> {
  return submitRinaIntent(intent, projectRoot, context)
}

function createLegacyExplainIntent(request: LegacyExplainRequest): RinaIntent {
  return {
    id: `legacy:explain:${Date.now()}`,
    source: 'ui',
    kind: 'analyze',
    target: 'error.explanation',
    payload: {
      prompt: `Explain this error and suggest fixes:\n${request.errorText}`,
      context: request.context,
    },
    createdAt: Date.now(),
  }
}

/**
 * Bridge: legacy error explanation → handleIngress
 */
export async function legacyExplainErrorToRuntime(
  request: LegacyExplainRequest,
  fallbackProjectRoot: string,
): Promise<RinaExecutionRecord> {
  const intent = createLegacyExplainIntent(request)
  return submitLegacyIntentToRuntime(intent, fallbackProjectRoot)
}

/**
 * Bridge: legacy natural-language plan request → handleIngress
 */
export async function legacyPlanToRuntime(
  prompt: string,
  projectRoot: string,
): Promise<RinaExecutionRecord> {
  const intent = createUiAnalyzeIntent(prompt, projectRoot)
  intent.id = `legacy:plan:${Date.now()}`
  return submitLegacyIntentToRuntime(intent, projectRoot)
}

/**
 * Adapter: legacy explain API shape (string) from runtime record.
 */
export async function legacyExplainErrorAsText(
  request: LegacyExplainRequest,
  fallbackProjectRoot: string,
): Promise<string> {
  const record = await legacyExplainErrorToRuntime(request, fallbackProjectRoot)
  return executionRecordToLegacyText(record)
}

/**
 * Adapter: map runtime record → legacy planner output (steps may be empty until runtime returns structured plans).
 */
export function executionRecordToLegacyPlannerOutput(
  record: RinaExecutionRecord,
): LegacyPlannerOutput {
  const command =
    typeof record.outcome?.command === 'string' && record.outcome.command.trim()
      ? record.outcome.command.trim()
      : null

  const steps =
    command != null
      ? [{ tool: 'terminal', action: command, description: record.outcome?.explanation }]
      : []

  return {
    steps,
    explanation: record.outcome?.explanation,
    requiresApproval: record.outcome?.risk === 'high' || record.outcome?.risk === 'medium',
  }
}

export { buildExecutionRecord }
