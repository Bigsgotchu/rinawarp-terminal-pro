/**
 * Rina OS Control Layer - Agent Network
 *
 * Multi-agent collaboration system for team-aware task sharing.
 * Enables Rina to broadcast tasks, sync with other agents, and collaborate.
 *
 * Key features:
 * - Peer awareness (see active agents and tasks)
 * - Task delegation across agents
 * - Conflict resolution (no duplicate execution)
 * - Encrypted communication via cloud sync
 * - Offline safety with local queue
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { rinaMemory, type PersistentEntry } from '../memory/persistent-memory.js'
import { cloudSync } from '../memory/cloud-sync.js'
import { safetyCheck } from '../safety.js'

/**
 * Task status in the network
 */
export type NetworkTaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

/**
 * A task shared across agents
 */
export interface NetworkTask {
  id: string
  task: string
  agentId: string
  timestamp: number
  status: NetworkTaskStatus
  result?: string
  error?: string
}

/**
 * Network peer information
 */
export interface AgentPeer {
  agentId: string
  lastSeen: number
  activeTasks: number
}

/**
 * AgentNetwork - Multi-agent collaboration
 */
export class AgentNetwork {
  private agentId: string
  private tasks: Map<string, NetworkTask> = new Map()
  private peers: Map<string, AgentPeer> = new Map()

  constructor(agentId: string) {
    this.agentId = agentId
    this.loadLocalTasks()
  }

  /**
   * Get this agent's ID
   */
  getAgentId(): string {
    return this.agentId
  }

  /**
   * Load tasks from local persistent memory
   */
  private loadLocalTasks(): void {
    const entries = rinaMemory.getAll()
    entries.forEach((entry) => {
      if (entry.metadata?.type === 'network-task') {
        const task = entry.metadata.task as NetworkTask
        if (task) {
          this.tasks.set(task.id, task)
        }
      }
    })
  }

  /**
   * Generate a unique task ID
   */
  private generateTaskId(): string {
    return `${this.agentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Check if a task already exists
   */
  private hasTask(taskId: string): boolean {
    return this.tasks.has(taskId)
  }

  /**
   * Add a task locally
   */
  private addTaskLocally(task: NetworkTask): void {
    this.tasks.set(task.id, task)

    // Store in persistent memory
    rinaMemory.store(`network-task: ${task.task}`, JSON.stringify({ type: 'network-task', task }), {
      type: 'network-task',
      task,
    })
  }

  /**
   * Broadcast a task to the network
   * Only tasks that pass safety checks can be broadcast
   */
  async broadcastTask(taskString: string): Promise<NetworkTask | null> {
    // Safety check before broadcasting
    const safety = safetyCheck(taskString, 'assist')

    if (safety.blocked) {
      console.log(`🌐 Task blocked by safety: ${safety.reason}`)
      return null
    }

    const task: NetworkTask = {
      id: this.generateTaskId(),
      task: taskString,
      agentId: this.agentId,
      timestamp: Date.now(),
      status: 'pending',
    }

    // Save locally
    this.addTaskLocally(task)

    // Push to cloud for other agents
    const taskEntry: PersistentEntry = {
      timestamp: task.timestamp,
      userInput: `network-task: ${task.task}`,
      agentResponse: JSON.stringify(task),
      metadata: { type: 'network-task', task },
    }

    await cloudSync.push([taskEntry])
    console.log(`🌐 Broadcasted task: ${task.task} (${task.id})`)

    return task
  }

  /**
   * Sync tasks from cloud (other agents)
   */
  async syncTasks(): Promise<number> {
    const cloudEntries = await cloudSync.pull()
    let syncedCount = 0

    cloudEntries.forEach((entry) => {
      if (entry.metadata?.type === 'network-task') {
        const task = entry.metadata.task as NetworkTask

        // Don't add our own tasks or duplicates
        if (task && task.agentId !== this.agentId && !this.hasTask(task.id)) {
          this.tasks.set(task.id, task)
          syncedCount++
        }
      }
    })

    console.log(`🌐 Synced ${syncedCount} tasks from network`)
    return syncedCount
  }

  /**
   * Get all tasks
   */
  listTasks(): NetworkTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: NetworkTaskStatus): NetworkTask[] {
    return this.listTasks().filter((t) => t.status === status)
  }

  /**
   * Get pending tasks (from other agents)
   */
  getPendingTasks(): NetworkTask[] {
    return this.listTasks().filter((t) => t.status === 'pending' && t.agentId !== this.agentId)
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: NetworkTaskStatus, result?: string, error?: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.status = status
    if (result) task.result = result
    if (error) task.error = error

    // Sync update to cloud
    const taskEntry: PersistentEntry = {
      timestamp: task.timestamp,
      userInput: `network-task: ${task.task}`,
      agentResponse: JSON.stringify(task),
      metadata: { type: 'network-task', task },
    }

    cloudSync.push([taskEntry])

    return true
  }

  /**
   * Claim a task (mark as in-progress)
   */
  async claimTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'pending') {
      return false
    }

    return this.updateTaskStatus(taskId, 'in-progress')
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, result: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, 'completed', result)
  }

  /**
   * Fail a task
   */
  async failTask(taskId: string, error: string): Promise<boolean> {
    return this.updateTaskStatus(taskId, 'failed', undefined, error)
  }

  /**
   * Get network statistics
   */
  getStats(): {
    totalTasks: number
    pending: number
    inProgress: number
    completed: number
    failed: number
    uniqueAgents: number
  } {
    const tasks = this.listTasks()
    const agents = new Set(tasks.map((t) => t.agentId))

    return {
      totalTasks: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      uniqueAgents: agents.size,
    }
  }

  /**
   * Clear all network tasks (local only)
   */
  clearLocalTasks(): void {
    this.tasks.clear()
  }
}
