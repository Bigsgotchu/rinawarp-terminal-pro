/**
 * Rina OS Control Layer - Task Orchestrator
 *
 * Real-time task coordination system that supervises agents,
 * tracks task dependencies, and handles automatic retries.
 *
 * Key features:
 * - Sequential task queue execution
 * - EventEmitter for real-time progress
 * - Automatic retries via reflection integration
 * - Safe integration with all existing tools
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { EventEmitter } from 'events'
import { rinaController } from './rina-controller.js'
import { reflectionEngine } from './reflection.js'

/**
 * Task status in the orchestrator
 */
export type OrchestratorTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying'

/**
 * A task in the orchestrator queue
 */
export interface OrchestratorTask {
  id: string
  command: string
  status: OrchestratorTaskStatus
  result?: unknown
  error?: string
  attempts: number
  maxAttempts: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  dependencies?: string[]
}

/**
 * Task Orchestration Events
 */
export interface OrchestratorEvents {
  taskQueued: OrchestratorTask
  taskStarted: OrchestratorTask
  taskCompleted: OrchestratorTask
  taskFailed: OrchestratorTask
  taskRetrying: OrchestratorTask
  queueEmpty: void
  queueCleared: void
}

/**
 * TaskOrchestrator - Coordinates task execution
 */
export class TaskOrchestrator extends EventEmitter {
  private queue: OrchestratorTask[] = []
  private running = false
  private maxConcurrent = 1
  private maxRetries = 3

  constructor() {
    super()
  }

  /**
   * Generate a unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Enqueue a task for execution
   */
  enqueue(command: string, maxAttempts: number = this.maxRetries, dependencies?: string[]): string {
    const task: OrchestratorTask = {
      id: this.generateTaskId(),
      command,
      status: 'queued',
      attempts: 0,
      maxAttempts,
      createdAt: Date.now(),
      dependencies,
    }

    this.queue.push(task)
    this.emit('taskQueued', task)

    console.log(`📋 Orchestrator: Queued task ${task.id}: ${command}`)

    // Start processing if not already running
    this.runNext()

    return task.id
  }

  /**
   * Get the current queue
   */
  getQueue(): OrchestratorTask[] {
    return [...this.queue]
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): OrchestratorTask | undefined {
    return this.queue.find((t) => t.id === taskId)
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Check if orchestrator is running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Run the next task in the queue
   */
  private async runNext(): Promise<void> {
    // Don't run if already processing or queue is empty
    if (this.running || this.queue.length === 0) return

    // Find next queued task (respecting dependencies)
    const nextTaskIndex = this.queue.findIndex((task) => {
      if (task.status !== 'queued') return false

      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const depsCompleted = task.dependencies.every((depId) => {
          const depTask = this.queue.find((t) => t.id === depId)
          return depTask && depTask.status === 'completed'
        })
        return depsCompleted
      }

      return true
    })

    if (nextTaskIndex === -1) {
      // No task ready to run
      if (this.queue.every((t) => t.status !== 'queued')) {
        this.emit('queueEmpty', undefined)
      }
      return
    }

    this.running = true
    const task = this.queue[nextTaskIndex]

    try {
      task.status = 'running'
      task.startedAt = Date.now()
      this.emit('taskStarted', task)

      console.log(`🚀 Orchestrator: Starting task ${task.id}`)

      // Execute via rinaController
      const result = await rinaController.runAgent(task.command)

      // Check if the task was successful - handle different return types
      const isSuccess = 'success' in result ? result.success : 'output' in result
      if (isSuccess) {
        task.status = 'completed'
        task.result = result
        task.completedAt = Date.now()
        this.emit('taskCompleted', task)
        console.log(`✅ Orchestrator: Task ${task.id} completed`)
      } else {
        // Task failed - check if we should retry
        await this.handleTaskFailure(task, result)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      await this.handleTaskError(task, errorMsg)
    } finally {
      this.running = false
      // Process next task
      this.runNext()
    }
  }

  /**
   * Handle task failure with retry logic
   */
  private async handleTaskFailure(task: OrchestratorTask, result: unknown): Promise<void> {
    task.attempts++

    if (task.attempts < task.maxAttempts) {
      // Use reflection engine to get insights for retry
      const insights = reflectionEngine.getFailureCount(task.id)
      console.log(`🔄 Orchestrator: Task ${task.id} failed, attempt ${task.attempts}/${task.maxAttempts}`)

      task.status = 'retrying'
      this.emit('taskRetrying', task)

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, task.attempts), 5000)
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Re-queue the task
      task.status = 'queued'
      this.runNext()
    } else {
      task.status = 'failed'
      task.error = 'Max retries exceeded'
      task.completedAt = Date.now()
      this.emit('taskFailed', task)
      console.log(`❌ Orchestrator: Task ${task.id} failed after ${task.attempts} attempts`)
    }
  }

  /**
   * Handle task error
   */
  private async handleTaskError(task: OrchestratorTask, errorMsg: string): Promise<void> {
    task.attempts++

    if (task.attempts < task.maxAttempts) {
      console.log(`🔄 Orchestrator: Task ${task.id} error, retrying (${task.attempts}/${task.maxAttempts})`)

      task.status = 'retrying'
      this.emit('taskRetrying', task)

      // Wait before retry
      const delay = Math.min(1000 * Math.pow(2, task.attempts), 5000)
      await new Promise((resolve) => setTimeout(resolve, delay))

      task.status = 'queued'
      this.runNext()
    } else {
      task.status = 'failed'
      task.error = errorMsg
      task.completedAt = Date.now()
      this.emit('taskFailed', task)
      console.log(`❌ Orchestrator: Task ${task.id} failed with error: ${errorMsg}`)
    }
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const taskIndex = this.queue.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) return false

    const task = this.queue[taskIndex]

    // Can only cancel queued tasks
    if (task.status !== 'queued') {
      return false
    }

    this.queue.splice(taskIndex, 1)
    console.log(`🚫 Orchestrator: Cancelled task ${taskId}`)
    return true
  }

  /**
   * Clear the entire queue
   */
  clearQueue(): void {
    const queuedTasks = this.queue.filter((t) => t.status === 'queued')
    this.queue = this.queue.filter((t) => t.status !== 'queued')

    if (queuedTasks.length > 0) {
      console.log(`🗑️ Orchestrator: Cleared ${queuedTasks.length} queued tasks`)
    }

    this.emit('queueCleared', undefined)
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    queued: number
    running: number
    completed: number
    failed: number
    total: number
    successRate: number
  } {
    const completed = this.queue.filter((t) => t.status === 'completed').length
    const failed = this.queue.filter((t) => t.status === 'failed').length
    const total = this.queue.length
    const successRate = total > 0 ? (completed / total) * 100 : 0

    return {
      queued: this.queue.filter((t) => t.status === 'queued').length,
      running: this.queue.filter((t) => t.status === 'running' || t.status === 'retrying').length,
      completed,
      failed,
      total,
      successRate: Math.round(successRate),
    }
  }

  /**
   * Wait for a specific task to complete
   */
  waitForTask(taskId: string, timeout: number = 60000): Promise<OrchestratorTask> {
    return new Promise((resolve, reject) => {
      const task = this.queue.find((t) => t.id === taskId)

      // If task already completed or failed, return immediately
      if (task && (task.status === 'completed' || task.status === 'failed')) {
        resolve(task)
        return
      }

      // Set timeout
      const timeoutId = setTimeout(() => {
        this.removeListener('taskCompleted', onComplete)
        this.removeListener('taskFailed', onFail)
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`))
      }, timeout)

      const onComplete = (eventTask: OrchestratorTask) => {
        if (eventTask.id === taskId) {
          clearTimeout(timeoutId)
          this.removeListener('taskCompleted', onComplete)
          this.removeListener('taskFailed', onFail)
          resolve(eventTask)
        }
      }

      const onFail = (eventTask: OrchestratorTask) => {
        if (eventTask.id === taskId) {
          clearTimeout(timeoutId)
          this.removeListener('taskCompleted', onComplete)
          this.removeListener('taskFailed', onFail)
          resolve(eventTask) // Resolve with failed task, don't reject
        }
      }

      this.on('taskCompleted', onComplete)
      this.on('taskFailed', onFail)
    })
  }
}

// Create orchestrator with type-safe events
const orchestrator = new TaskOrchestrator()

// Type-safe event emitter helper
export type OrchestratorEventMap = {
  [K in keyof OrchestratorEvents]: OrchestratorEvents[K] extends void
    ? () => void
    : (event: OrchestratorEvents[K]) => void
}

// Export typed event methods
export const taskOrchestrator: TaskOrchestrator & OrchestratorEventMap = orchestrator as TaskOrchestrator &
  OrchestratorEventMap
