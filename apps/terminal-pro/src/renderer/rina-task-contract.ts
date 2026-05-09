export type RinaTaskRequest = {
  message: string
  cwd?: string
}

export type RinaTaskResult = {
  summary: string
  status: 'completed' | 'needs_approval' | 'failed'
  evidence?: unknown
  actions?: unknown[]
}
