export type RinaTaskKind = 'disk_recovery' | 'port_conflict' | 'failed_build' | 'unknown'

export type RiskLevel = 'read' | 'safe-write' | 'destructive'

export type RinaTaskRequest = {
  id: string
  message: string
  cwd: string
}

export type RinaCommandPlan = {
  id: string
  command: string
  reason: string
  risk: RiskLevel
  requiresApproval: boolean
  expectedEffect: string
  rollbackAwareness: string
  verificationHint: string
  label?: string
}

export type RinaTaskPlan = {
  taskId: string
  kind: RinaTaskKind
  explanation: string
  readOnlyCommands: RinaCommandPlan[]
  proposedActions: RinaCommandPlan[]
}

export type RinaTaskResult = {
  taskId: string
  status: 'completed' | 'needs_approval' | 'failed'
  summary: string
  evidence: Record<string, unknown>
}

export type RinaCommandExecutionResult = {
  ok?: boolean
  skipped?: boolean
  reason?: string
  output?: string
  error?: string
}
