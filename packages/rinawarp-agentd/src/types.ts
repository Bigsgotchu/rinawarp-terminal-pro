export type AgentMode = 'agent' | 'terminal'

export type Risk = 'inspect' | 'safe-write' | 'high-impact'
export type RiskLevel = 'low' | 'medium' | 'high'

export type WorkspaceFact = {
  id: string
  key: string
  value: string
  category: 'architecture' | 'dependency' | 'convention' | 'preference' | 'recurring_failure' | 'runtime_fact'
  confidence: 'high' | 'medium' | 'low'
  source: 'proof' | 'config' | 'runtime' | 'inferred'
  workspaceId?: string
}

export type PlanStep = {
  stepId: string
  tool: 'terminal.write'
  description: string
  input: {
    command: string
    cwd?: string
    timeoutMs?: number
    env?: Record<string, string>
    stepId?: string
  }
  risk: Risk
  risk_level: RiskLevel
  requires_confirmation: boolean
  verification_plan: {
    steps: Array<{ tool: string; input: unknown }>
  }
  confirmationScope?: string // high-impact steps require this before execution
}

export type AgentPlan = {
  planId: string
  intentText: string
  projectRoot: string
  reasoning: string
  steps: PlanStep[]
}

export type AgentPlanRequest = {
  intentText: string
  projectRoot: string
  mode?: AgentMode
  workspaceContext?: {
    architecture: WorkspaceFact[]
    dependencies: WorkspaceFact[]
    runtimeFacts: WorkspaceFact[]
    deploymentFacts: WorkspaceFact[]
    conventions: WorkspaceFact[]
    preferences: WorkspaceFact[]
    confidenceSummary: {
      high: number
      medium: number
      low: number
    }
    conflictSummary: {
      totalConflicts: number
      conflicts: Array<{ key: string; persistedValue: string; observedValue: string }>
    }
  }
}

export type ExecutePlanRequest = {
  plan: PlanStep[]
  projectRoot: string
  confirmed: boolean
  confirmationText: string
}

export type ExecutePlanResponse = {
  ok: true
  planRunId: string
}

export type CancelRequest = {
  streamId?: string
  planRunId?: string
  reason?: 'soft' | 'timeout' | 'user'
}

export type ErrorResponse = {
  ok: false
  error: string
}

export type JsonResponse<T> = T | ErrorResponse
