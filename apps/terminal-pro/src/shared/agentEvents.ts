export type PlanStep = {
  id: string
  title: string
  description?: string
  command?: string
  risk: 'inspect' | 'safe-write' | 'dangerous' | 'blocked'
  requiresApproval: boolean
  mutation: boolean
}

export type AgentEvent =
  | {
      type: 'user.message'
      runId: string
      messageId: string
      text: string
      createdAt: string
    }
  | {
      type: 'understanding.created'
      runId: string
      summary: string
      createdAt: string
    }
  | {
      type: 'plan.created'
      runId: string
      steps: PlanStep[]
      createdAt: string
    }
  | {
      type: 'approval.required'
      runId: string
      actionId: string
      reason: string
      risk: 'safe-write' | 'dangerous'
    }
  | {
      type: 'action.started'
      runId: string
      actionId: string
      label: string
      command?: string
      tool?: string
      createdAt: string
    }
  | {
      type: 'stdout'
      runId: string
      actionId: string
      chunk: string
    }
  | {
      type: 'stderr'
      runId: string
      actionId: string
      chunk: string
    }
  | {
      type: 'action.completed'
      runId: string
      actionId: string
      exitCode?: number
      status: 'success' | 'failed' | 'cancelled' | 'blocked'
      finishedAt: string
    }
  | {
      type: 'verification.completed'
      runId: string
      passed: boolean
      command?: string
      exitCode?: number
      summary: string
    }
  | {
      type: 'receipt.created'
      runId: string
      receiptId: string
      proofBlockIds: string[]
      status: 'success' | 'failed' | 'blocked'
    }
