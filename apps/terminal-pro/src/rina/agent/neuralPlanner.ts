/**
 * LEGACY COMPATIBILITY — plan shape adapter only (no local planning logic).
 */

import {
  executionRecordToLegacyPlannerOutput,
  legacyPlanToRuntime,
} from '../../runtime/bridge/RinaRuntimeBridge.js'
import { thinkingStream } from '../thinking/thinkingStream.js'

export type PlanStep = {
  tool: string
  action: string
  description?: string
  timeout?: number
}

export type NeuralPlan = {
  id: string
  input: string
  steps: PlanStep[]
  reasoning?: string
}

const AVAILABLE_TOOLS = ['terminal', 'filesystem', 'git', 'docker', 'system']

export class NeuralPlanner {
  /** @deprecated Runtime owns model configuration. */
  isConfigured(): boolean {
    return false
  }

  async createPlan(userInput: string, projectRoot: string = process.cwd()): Promise<NeuralPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

    thinkingStream.emit('thinking', {
      type: 'neural_planner',
      status: 'generating',
      message: 'Forwarding plan to canonical runtime...',
    })

    try {
      const record = await legacyPlanToRuntime(userInput, projectRoot)
      const legacy = executionRecordToLegacyPlannerOutput(record)

      thinkingStream.emit('thinking', {
        type: 'neural_planner',
        status: legacy.steps.length > 0 ? 'success' : 'empty',
        message:
          legacy.steps.length > 0
            ? `Runtime returned ${legacy.steps.length} step(s)`
            : 'Runtime returned no executable steps',
      })

      return {
        id: planId,
        input: userInput,
        steps: legacy.steps.map((step, index) => ({
          tool: step.tool || 'terminal',
          action: step.action,
          description: step.description || `Step ${index + 1}`,
          timeout: 60000,
        })),
        reasoning: legacy.explanation,
      }
    } catch (error) {
      console.error('[NeuralPlanner] Runtime forward failed:', error)
      thinkingStream.emit('thinking', {
        type: 'neural_planner',
        status: 'error',
        message: `Planning forward failed: ${error}`,
      })

      return {
        id: planId,
        input: userInput,
        steps: [],
        reasoning: 'Runtime planning forward failed',
      }
    }
  }

  getAvailableTools(): string[] {
    return AVAILABLE_TOOLS
  }
}

export const neuralPlanner = new NeuralPlanner()
