/**
 * LEGACY INPUT ADAPTER — repair execution forwards to runtime (no shell here).
 */

import type { EventEmitter } from 'events'
import type { RepairPlan, RepairStep } from '../repair-planner.js'
import type { RinaResponse } from './types.js'
import { forwardLegacyPrompt, repairPlanExecutionPrompt } from './legacyInputAdapter.js'

export async function executeCurrentRepairPlanRuntime(args: {
  currentRepairPlan: RepairPlan | null
  workspaceRoot: string
  emitter: EventEmitter
}): Promise<RinaResponse> {
  if (!args.currentRepairPlan) {
    return { ok: false, intent: 'fix', error: 'No repair plan available. Run "rina fix" first.' }
  }
  if (!args.workspaceRoot) {
    return { ok: false, intent: 'fix', error: 'No workspace set.' }
  }

  args.emitter.emit('repair:forward', { planId: args.currentRepairPlan.goal })
  return forwardLegacyPrompt(
    repairPlanExecutionPrompt(args.currentRepairPlan),
    args.workspaceRoot,
    'fix',
  )
}

export async function executeRepairStepRuntime(args: {
  currentRepairPlan: RepairPlan | null
  workspaceRoot: string
  stepId: string
}): Promise<RinaResponse> {
  if (!args.currentRepairPlan) {
    return { ok: false, intent: 'fix', error: 'No repair plan available. Run "rina fix" first.' }
  }
  if (!args.workspaceRoot) {
    return { ok: false, intent: 'fix', error: 'No workspace set.' }
  }

  const step = args.currentRepairPlan.steps.find((entry) => entry.id === args.stepId)
  if (!step) {
    return { ok: false, intent: 'fix', error: `Step "${args.stepId}" not found in repair plan.` }
  }

  return forwardLegacyPrompt(
    repairPlanExecutionPrompt(args.currentRepairPlan, step),
    args.workspaceRoot,
    'fix-step',
  )
}
