import type { ConversationPlanPreview } from './conversationTypes.js'

export type TaskHandle = {
  id: string
  started: boolean
  plan: ConversationPlanPreview
  status: 'planned' | 'running' | 'cancelled' | 'completed' | 'failed'
}

export interface TaskController {
  start(plan: ConversationPlanPreview): Promise<TaskHandle>
  cancel(taskId: string): Promise<void>
  retry(taskId: string): Promise<void>
  resume(taskId: string): Promise<void>
  get(taskId: string): TaskHandle | null
}

export function createInMemoryTaskController(): TaskController {
  const tasks = new Map<string, TaskHandle>()

  function getExisting(taskId: string): TaskHandle {
    const task = tasks.get(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)
    return task
  }

  return {
    async start(plan) {
      const handle: TaskHandle = {
        id: `task_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        started: false,
        plan,
        status: 'planned',
      }
      tasks.set(handle.id, handle)
      return handle
    },
    async cancel(taskId) {
      const task = getExisting(taskId)
      task.status = 'cancelled'
    },
    async retry(taskId) {
      const task = getExisting(taskId)
      task.status = 'planned'
      task.started = false
    },
    async resume(taskId) {
      const task = getExisting(taskId)
      task.status = 'planned'
    },
    get(taskId) {
      return tasks.get(taskId) || null
    },
  }
}
