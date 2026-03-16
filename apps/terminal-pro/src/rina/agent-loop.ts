/**
 * Rina OS Control Layer - Agent Loop
 *
 * Orchestrates planning and execution of complex multi-step tasks.
 * This is the core of Rina's autonomous agent capabilities.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { taskPlanner, type RinaPlan } from './planner/task-planner.js'
import { taskQueue, type StepExecutionResult, type TaskQueueState } from './executor/task-queue.js'
import { remember } from './memory/session.js'
import { reflectionEngine, type ReflectionResult } from './reflection.js'

/**
 * Callback types for agent events
 */
export type AgentEventCallback = (event: AgentEvent) => void

/**
 * Agent events
 */
export type AgentEvent =
  | { type: 'planning'; goal: string }
  | { type: 'plan-created'; plan: RinaPlan }
  | { type: 'step-starting'; step: StepExecutionResult }
  | { type: 'step-completed'; step: StepExecutionResult }
  | { type: 'step-failed'; step: StepExecutionResult }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'completed'; results: StepExecutionResult[] }
  | { type: 'error'; error: string }

/**
 * Agent execution result
 */
export type AgentResult = {
  goal: string
  plan: RinaPlan
  results: StepExecutionResult[]
  success: boolean
  summary: {
    totalSteps: number
    successfulSteps: number
    failedSteps: number
    durationMs: number
  }
  reflection?: ReflectionResult
}

/**
 * Agent Loop - Orchestrates autonomous execution
 */
export class AgentLoop {
  private eventCallbacks: AgentEventCallback[] = []
  private isRunning = false
  private startTime = 0

  /**
   * Subscribe to agent events
   */
  onEvent(callback: AgentEventCallback): () => void {
    this.eventCallbacks.push(callback)
    return () => {
      const index = this.eventCallbacks.indexOf(callback)
      if (index > -1) {
        this.eventCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: AgentEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch (err) {
        console.error('Agent event callback error:', err)
      }
    }
  }

  /**
   * Check if agent is currently running
   */
  getRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get current queue state
   */
  getState(): TaskQueueState {
    return taskQueue.getState()
  }

  /**
   * Run a goal autonomously
   */
  async run(goal: string): Promise<AgentResult> {
    if (this.isRunning) {
      return {
        goal,
        plan: { goal, steps: [] },
        results: [],
        success: false,
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          durationMs: 0,
        },
      }
    }

    this.isRunning = true
    this.startTime = Date.now()

    // Emit planning event
    this.emit({ type: 'planning', goal })

    // Store in memory
    remember('system', `Starting agent loop for: ${goal}`)

    try {
      // Create plan
      const plan = await taskPlanner.createPlan(goal)

      this.emit({ type: 'plan-created', plan })
      remember('system', `Plan created with ${plan.steps.length} steps`)

      // Load plan into queue
      taskQueue.loadPlan(plan)

      // Execute all steps
      const results = await taskQueue.runAll((stepResult) => {
        if (stepResult.success) {
          this.emit({ type: 'step-completed', step: stepResult })
          remember('system', `Step ${stepResult.step.id} completed: ${stepResult.step.description}`)
        } else {
          this.emit({ type: 'step-failed', step: stepResult })
          remember('system', `Step ${stepResult.step.id} failed: ${stepResult.error}`)
        }
      })

      // Calculate summary
      const successfulSteps = results.filter((r) => r.success).length
      const failedSteps = results.filter((r) => !r.success).length
      const durationMs = Date.now() - this.startTime

      const success = failedSteps === 0

      this.emit({ type: 'completed', results })

      // Perform reflection on the execution
      const reflection = await reflectionEngine.reflectOnTask(goal, plan.steps, results)

      this.isRunning = false

      return {
        goal,
        plan,
        results,
        success,
        summary: {
          totalSteps: results.length,
          successfulSteps,
          failedSteps,
          durationMs,
        },
        reflection,
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      this.emit({ type: 'error', error: errorMsg })
      remember('system', `Agent loop error: ${errorMsg}`)

      this.isRunning = false

      return {
        goal,
        plan: { goal, steps: [] },
        results: [],
        success: false,
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          durationMs: Date.now() - this.startTime,
        },
      }
    }
  }

  /**
   * Run a goal step by step (for streaming UI)
   */
  async *runStreaming(goal: string): AsyncGenerator<AgentEvent, AgentResult, unknown> {
    if (this.isRunning) {
      return {
        goal,
        plan: { goal, steps: [] },
        results: [],
        success: false,
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          durationMs: 0,
        },
      }
    }

    this.isRunning = true
    this.startTime = Date.now()

    try {
      // Emit planning event
      this.emit({ type: 'planning', goal })
      yield { type: 'planning', goal }

      // Create plan
      const plan = await taskPlanner.createPlan(goal)
      this.emit({ type: 'plan-created', plan })
      yield { type: 'plan-created', plan }

      // Load plan
      taskQueue.loadPlan(plan)

      // Execute steps one by one
      const results: StepExecutionResult[] = []

      while (taskQueue.hasNext()) {
        const { stepResult, done } = await taskQueue.runNext()

        if (stepResult) {
          results.push(stepResult)

          if (stepResult.success) {
            this.emit({ type: 'step-completed', step: stepResult })
            yield { type: 'step-completed', step: stepResult }
          } else {
            this.emit({ type: 'step-failed', step: stepResult })
            yield { type: 'step-failed', step: stepResult }
          }
        }

        if (done) break
      }

      const successfulSteps = results.filter((r) => r.success).length
      const failedSteps = results.filter((r) => !r.success).length

      this.emit({ type: 'completed', results })

      return {
        goal,
        plan,
        results,
        success: failedSteps === 0,
        summary: {
          totalSteps: results.length,
          successfulSteps,
          failedSteps,
          durationMs: Date.now() - this.startTime,
        },
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.emit({ type: 'error', error: errorMsg })
      return {
        goal,
        plan: { goal, steps: [] },
        results: [],
        success: false,
        summary: {
          totalSteps: 0,
          successfulSteps: 0,
          failedSteps: 0,
          durationMs: Date.now() - this.startTime,
        },
      }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Pause execution
   */
  pause(): void {
    taskQueue.pause()
    this.emit({ type: 'paused' })
  }

  /**
   * Resume execution
   */
  resume(): void {
    taskQueue.resume()
    this.emit({ type: 'resumed' })
  }

  /**
   * Stop execution
   */
  stop(): void {
    taskQueue.reset()
    this.isRunning = false
  }

  /**
   * Get progress
   */
  getProgress(): { current: number; total: number; percentage: number } {
    const state = taskQueue.getState()
    return {
      current: state.currentIndex,
      total: state.plan?.steps.length || 0,
      percentage: taskQueue.getProgress(),
    }
  }
}

// Singleton instance
export const agentLoop = new AgentLoop()
