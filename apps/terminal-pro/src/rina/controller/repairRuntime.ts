import type { EventEmitter } from 'events'
import { executeRepairPlan, executeRepairStep, type RepairPlan } from '../repair-planner.js'

type RinaResponse = {
  ok: boolean
  intent: string
  output?: unknown
  error?: string
}

export async function executeCurrentRepairPlanRuntime(args: {
  currentRepairPlan: RepairPlan | null
  workspaceRoot: string
  emitter: EventEmitter
}): Promise<RinaResponse> {
  if (!args.currentRepairPlan) {
    return {
      ok: false,
      intent: 'fix',
      error: 'No repair plan available. Run "rina fix" first.',
    }
  }

  if (!args.workspaceRoot) {
    return {
      ok: false,
      intent: 'fix',
      error: 'No workspace set.',
    }
  }

  try {
    const result = await executeRepairPlan(args.currentRepairPlan, args.workspaceRoot, (step, stepResult) => {
      args.emitter.emit('repair:stepComplete', { step, result: stepResult })
    })

    return {
      ok: result.success,
      intent: 'fix',
      output: {
        success: result.success,
        stepsExecuted: result.results.length,
        results: result.results.map((r) => ({
          stepId: r.step.id,
          command: r.step.command,
          success: r.result.success,
          output: r.result.output.substring(0, 500),
        })),
      },
    }
  } catch (err) {
    return {
      ok: false,
      intent: 'fix',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function executeRepairStepRuntime(args: {
  currentRepairPlan: RepairPlan | null
  workspaceRoot: string
  stepId: string
}): Promise<RinaResponse> {
  if (!args.currentRepairPlan) {
    return {
      ok: false,
      intent: 'fix',
      error: 'No repair plan available. Run "rina fix" first.',
    }
  }

  if (!args.workspaceRoot) {
    return {
      ok: false,
      intent: 'fix',
      error: 'No workspace set.',
    }
  }

  const step = args.currentRepairPlan.steps.find((s) => s.id === args.stepId)
  if (!step) {
    return {
      ok: false,
      intent: 'fix',
      error: `Step "${args.stepId}" not found in repair plan.`,
    }
  }

  try {
    const result = await executeRepairStep(step, args.workspaceRoot)
    return {
      ok: result.success,
      intent: 'fix',
      output: {
        stepId: step.id,
        command: step.command,
        description: step.description,
        success: result.success,
        output: result.output,
        error: result.error,
      },
    }
  } catch (err) {
    return {
      ok: false,
      intent: 'fix',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

