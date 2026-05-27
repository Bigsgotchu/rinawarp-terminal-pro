/**
 * Legacy input adapter — maps messages to runtime ingress (no execution here).
 */

import type { RinaExecutionRecord } from '@rinawarp/rina-core'
import { createUiAnalyzeIntent } from '../../main/assistant/rinaIntentLoop.js'
import {
  executionRecordToLegacyText,
  submitLegacyIntentToRuntime,
} from '../../runtime/bridge/RinaRuntimeBridge.js'
import type { RepairPlan, RepairStep } from '../repair-planner.js'
import type { RinaResponse } from './types.js'

export function repairPlanExecutionPrompt(plan: RepairPlan, step?: RepairStep): string {
  if (step) {
    return [
      'Execute this single repair step in the workspace:',
      `Step: ${step.description}`,
      `Command: ${step.command}`,
      `Plan goal: ${plan.goal}`,
    ].join('\n')
  }

  const steps = plan.steps.map((entry, index) => `${index + 1}. ${entry.description} — ${entry.command}`).join('\n')
  return [`Execute this repair plan in the workspace:`, `Goal: ${plan.goal}`, 'Steps:', steps].join('\n')
}

function recordSucceeded(record: RinaExecutionRecord): boolean {
  return !record.events.some((event) => event.type === 'execution.failed')
}

export function executionRecordToRinaResponse(
  record: RinaExecutionRecord,
  intent: string,
): RinaResponse {
  const text = executionRecordToLegacyText(record)
  const ok = recordSucceeded(record)
  return {
    ok,
    intent,
    output: ok ? text : undefined,
    error: ok ? undefined : text,
  }
}

/**
 * Forward natural-language legacy input to canonical runtime.
 */
export async function forwardLegacyPrompt(
  prompt: string,
  projectRoot: string,
  intentLabel: string,
): Promise<RinaResponse> {
  const root = projectRoot?.trim() || process.cwd()
  const intent = createUiAnalyzeIntent(prompt.trim(), root)
  intent.id = `legacy:msg:${Date.now()}`
  const record = await submitLegacyIntentToRuntime(intent, root)
  return executionRecordToRinaResponse(record, intentLabel)
}
