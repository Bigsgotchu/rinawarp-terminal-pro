// Re-export types and functions expected by registerAllIpc
export type AgentPlan = {
  id: string
  intent: string
  reasoning: string
  steps: Array<{
    id: string
    tool: string
    command: string
    risk: string
    description?: string
  }>
  playbookId?: string
}
