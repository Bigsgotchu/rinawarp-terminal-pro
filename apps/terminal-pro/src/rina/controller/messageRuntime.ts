import type { EventEmitter } from 'events'
import type { AgentPlan } from '../types.js'
import type { ReflectionResult } from '../reflection.js'
import { buildRepairPlan, formatRepairPlan, scanProjectContext, type RepairPlan } from '../repair-planner.js'
import { explainError } from '../error-explainer.js'
import { brainEvents } from '../brain/brainEvents.js'
import { thinkingStream } from '../thinking/thinkingStream.js'
import type { RinaResponse, RinaToolsInterface } from '../rina-controller.js'

type RunAgentRuntimeDeps = {
  planOrCommand: string | AgentPlan
  mode: 'auto' | 'assist' | 'explain'
  tools: RinaToolsInterface
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
  executeCurrentRepairPlan: () => Promise<RinaResponse>
  executeRepairStep: (stepId: string) => Promise<RinaResponse>
  executeIntentCommand: (intent: 'build' | 'test' | 'lint' | 'deploy' | 'analyze') => Promise<RinaResponse>
  getStatus: () => unknown
  mode: 'auto' | 'assist' | 'explain'
  tools: RinaToolsInterface
}

export async function runAgentRuntime(deps: RunAgentRuntimeDeps) {
  deps.setRunning(true)
  const taskId = `task-${Date.now()}`
  deps.setCurrentTaskId(taskId)

  thinkingStream.stream(`Starting agent: ${typeof deps.planOrCommand === 'string' ? deps.planOrCommand : deps.planOrCommand.id}`)

  try {
    deps.emitter.emit('agent:event', { type: 'stepStarted', step: 'initializing', taskId })

    let result

    if (typeof deps.planOrCommand === 'string') {
      brainEvents.emitEvent('intent', `Executing: ${deps.planOrCommand}`, { taskId })
      const terminalResult = await deps.tools.terminal.runCommand(deps.planOrCommand, deps.mode)
      result = {
        ok: terminalResult.ok,
        output: terminalResult.output,
        error: terminalResult.error,
      }
    } else {
      const steps = deps.planOrCommand.steps || []
      const reflections: ReflectionResult['insights'] = []

      for (let i = 0; i < steps.length; i += 1) {
        const step = steps[i]
        deps.emitter.emit('agent:event', { type: 'stepStarted', step, taskId })
        brainEvents.emitEvent('execution', `Step ${i + 1}/${steps.length}: ${step}`, { taskId, step })

        try {
          const stepResult = await deps.tools.terminal.runCommand(String(step), deps.mode)
          reflections.push({
            stepId: step,
            stepDescription: step,
            feedback: [String(stepResult.output || stepResult.error || '')],
            severity: 'info',
          })
          deps.emitter.emit('agent:event', { type: 'stepCompleted', step, taskId })
        } catch (stepError) {
          deps.emitter.emit('agent:event', { type: 'stepFailed', step, error: stepError, taskId })
          brainEvents.emitEvent('error', `Step failed: ${step}`, { taskId, step, error: stepError })
          reflections.push({
            stepId: step,
            stepDescription: step,
            feedback: [stepError instanceof Error ? stepError.message : String(stepError)],
            severity: 'error',
          })
        }
      }

      const reflection: ReflectionResult = {
        taskId,
        insights: reflections,
        nextActions: ['Review results', 'Continue or abort'],
        success: reflections.every((entry) => entry.severity !== 'error'),
        performanceMetrics: {
          totalDurationMs: steps.length * 1000,
          expectedDurationMs: steps.length * 800,
          stepsOverExpected: 0,
        },
      }

      result = {
        reflection,
        success: reflection.success,
        summary: {
          totalSteps: steps.length,
          successfulSteps: reflections.filter((entry) => entry.severity !== 'error').length,
          failedSteps: reflections.filter((entry) => entry.severity === 'error').length,
          durationMs: steps.length * 1000,
        },
        ok: reflection.success,
      }
    }

    brainEvents.emitEvent(
      'result',
      `Agent completed: ${typeof deps.planOrCommand === 'string' ? deps.planOrCommand : deps.planOrCommand.id}`,
      { taskId, success: result && 'ok' in result ? result.ok : true },
    )

    return result
  } catch (error) {
    brainEvents.emitEvent('error', 'Agent execution failed', { taskId, error })
    throw error
  } finally {
    deps.setRunning(false)
    deps.setCurrentTaskId(null)
  }
}

export async function handleMessageRuntime(deps: HandleMessageRuntimeDeps): Promise<RinaResponse> {
  thinkingStream.stream(`Processing: ${deps.message}`)
  const intent = deps.parseIntent(deps.message)

  try {
    switch (intent) {
      case 'fix':
        if (!deps.workspaceRoot) {
          return {
            ok: false,
            intent,
            error: 'No workspace set. Please open a project first.',
          }
        }

        try {
          const context = await scanProjectContext(deps.workspaceRoot)
          const plan = await buildRepairPlan(deps.workspaceRoot)
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
        return deps.executeCurrentRepairPlan()

      case 'fix-step': {
        const stepIdMatch = deps.message.match(/fix[\s-]step[\s-](\d+)/i)
        if (stepIdMatch) {
          const stepIndex = parseInt(stepIdMatch[1]) - 1
          if (deps.currentRepairPlan && stepIndex >= 0 && stepIndex < deps.currentRepairPlan.steps.length) {
            const step = deps.currentRepairPlan.steps[stepIndex]
            return deps.executeRepairStep(step.id)
          }
          return {
            ok: false,
            intent,
            error: `Step ${stepIdMatch[1]} not found in repair plan.`,
          }
        }
        return {
          ok: false,
          intent,
          error: 'Usage: rina fix step <number>',
        }
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

        try {
          const explanation = await explainError(errorText, deps.workspaceRoot)
          return {
            ok: true,
            intent,
            output: {
              message: explanation,
              originalError: errorText,
            },
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
        return deps.executeIntentCommand(intent)

      case 'status':
        return {
          ok: true,
          intent,
          output: deps.getStatus(),
        }

      case 'help':
        return {
          ok: true,
          intent,
          output: {
            commands: ['build', 'test', 'deploy', 'analyze', 'lint', 'status', 'help', 'fix', 'explain'],
            description: 'Available commands',
            newCommands: {
              fix: 'Automatically detect and fix project errors',
              explain: 'Explain an error message in plain English',
            },
          },
        }

      default: {
        const execResult = await deps.tools.terminal.runCommand(deps.message, deps.mode)
        return {
          ok: execResult.ok,
          intent: 'execute',
          output: execResult.output,
          error: execResult.error,
        }
      }
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
