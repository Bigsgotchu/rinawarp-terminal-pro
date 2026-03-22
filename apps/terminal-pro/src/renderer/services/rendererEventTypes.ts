export interface BrainStats {
  total: number
  intent: number
  planning: number
  reasoning: number
  tool: number
  memory: number
  action: number
  result: number
  error: number
}

export interface BrainEvent {
  type: string
  message: string
  progress?: number
}

export interface ThinkingStep {
  time: number
  message: string
}
