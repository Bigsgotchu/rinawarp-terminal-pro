/**
 * LEGACY INPUT ADAPTER — no tool execution, no CLI, no agent loops.
 * All execution-shaped requests forward to canonical runtime ingress.
 */

import type { EventEmitter } from 'events'
import type { AgentPlan } from '../types.js'
import { buildRepairPlan, formatRepairPlan, scanProjectContext, type RepairPlan } from '../repair-planner.js'
import { explainError, explainErrorPattern } from '../error-explainer.js'
import { brainEvents } from '../brain/brainEvents.js'
import { thinkingStream } from '../thinking/thinkingStream.js'
import type { RinaResponse } from '../rina-controller.js'
import { forwardLegacyPrompt, repairPlanExecutionPrompt } from './legacyInputAdapter.js'

type RunAgentRuntimeDeps = {
  planOrCommand: string | AgentPlan
  workspaceRoot: string
  emitter: EventEmitter
  setRunning: (running: boolean) => void
  setCurrentTaskId: (taskId: string | null) => void
}

type HandleMessageRuntimeDeps = {
  message: string
  workspaceRoot: string
  parseIntent: (message: string) => string
  currentRepairPlan: RepairPlan | null
  setCurrentRepairPlan: (plan: RepairPlan | null) => void
  getStatus: () => unknown
}

export async function runAgentRuntime(deps: RunAgentRuntimeDeps) {
  deps.setRunning(true)
  const taskId = `task-${Date.now()}`
  deps.setCurrentTaskId(taskId)

  const label =
    typeof deps.planOrCommand === 'string' ? deps.planOrCommand : deps.planOrCommand.id || 'agent-plan'
  thinkingStream.stream(`Forwarding agent request to runtime: ${label}`)

  try {
    deps.emitter.emit('agent:event', { type: 'stepStarted', step: 'runtime.forward', taskId })
    brainEvents.emitEvent('intent', `Forwarding to runtime: ${label}`, { taskId })

    const prompt =
      typeof deps.planOrCommand === 'string'
        ? deps.planOrCommand
        : (deps.planOrCommand.steps || []).map((step) => String(step)).join('\n')

    const response = await forwardLegacyPrompt(prompt, deps.workspaceRoot, 'agent')

    deps.emitter.emit('agent:event', {
      type: response.ok ? 'stepCompleted' : 'stepFailed',
      step: 'runtime.forward',
      taskId,
      error: response.error,
    })
    brainEvents.emitEvent('result', `Runtime forward completed: ${label}`, {
      taskId,
      success: response.ok,
    })

    return response
  } catch (error) {
    brainEvents.emitEvent('error', 'Runtime forward failed', { taskId, error })
    throw error
  } finally {
    deps.setRunning(false)
    deps.setCurrentTaskId(null)
  }
}

export async function handleMessageRuntime(deps: HandleMessageRuntimeDeps): Promise<RinaResponse> {
  thinkingStream.stream(`Processing: ${deps.message}`)
  const intent = deps.parseIntent(deps.message)
  const root = deps.workspaceRoot

  try {
    switch (intent) {
      case 'fix':
        if (!root) {
          return {
            ok: false,
            intent,
            error: 'No workspace set. Please open a project first.',
          }
        }

        try {
          const context = await scanProjectContext(root)
          const plan = await buildRepairPlan(root)
          deps.setCurrentRepairPlan(plan)
          return {
            ok: true,
            intent,
            output: {
              message: formatRepairPlan(plan),
              plan,
              context,
              requiresConfirmation: !plan.autoExecutable,
            },
          }
        } catch (error) {
          return {
            ok: false,
            intent,
            error: error instanceof Error ? error.message : String(error),
          }
        }

      case 'fix-run':
        if (!deps.currentRepairPlan) {
          return {
            ok: false,
            intent,
            error: 'No repair plan available. Run "rina fix" first.',
          }
        }
        if (!root) {
          return { ok: false, intent, error: 'No workspace set.' }
        }
        return forwardLegacyPrompt(repairPlanExecutionPrompt(deps.currentRepairPlan), root, intent)

      case 'fix-step': {
        const stepIdMatch = deps.message.match(/fix[\s-]step[\s-](\d+)/i)
        if (!stepIdMatch) {
          return { ok: false, intent, error: 'Usage: rina fix step <number>' }
        }
        if (!deps.currentRepairPlan) {
          return { ok: false, intent, error: 'No repair plan available. Run "rina fix" first.' }
        }
        if (!root) {
          return { ok: false, intent, error: 'No workspace set.' }
        }

        const stepIndex = parseInt(stepIdMatch[1], 10) - 1
        const step = deps.currentRepairPlan.steps[stepIndex]
        if (!step) {
          return {
            ok: false,
            intent,
            error: `Step ${stepIdMatch[1]} not found in repair plan.`,
          }
        }

        return forwardLegacyPrompt(
          repairPlanExecutionPrompt(deps.currentRepairPlan, step),
          root,
          intent,
        )
      }

      case 'explain': {
        const errorText = deps.message.replace(/^rina\s+explain\s*/i, '').trim()
        if (!errorText) {
          return {
            ok: true,
            intent,
            output: {
              message: 'Usage: rina explain <error message>',
              example: 'rina explain Error: Cannot find module "express"',
            },
          }
        }

        const pattern = explainErrorPattern(errorText)
        if (pattern) {
          return {
            ok: true,
            intent,
            output: { message: pattern, originalError: errorText },
          }
        }

        try {
          const explanation = await explainError(errorText, root)
          return {
            ok: true,
            intent,
            output: { message: explanation, originalError: errorText },
          }
        } catch (error) {
          return {
            ok: false,
            intent,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }

      case 'build':
      case 'test':
      case 'deploy':
      case 'analyze':
      case 'lint':
        return forwardLegacyPrompt(`Run workspace ${intent} for this project.`, root || process.cwd(), intent)

      case 'status':
        return { ok: true, intent, output: deps.getStatus() }

      case 'help':
        return {
          ok: true,
          intent,
          output: {
            commands: ['build', 'test', 'deploy', 'analyze', 'lint', 'status', 'help', 'fix', 'explain'],
            description: 'Available commands',
            newCommands: {
              fix: 'Plan repairs via runtime (run with fix-run)',
              explain: 'Explain an error message via runtime',
            },
          },
        }

      default:
        return forwardLegacyPrompt(deps.message, root || process.cwd(), 'execute')
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
