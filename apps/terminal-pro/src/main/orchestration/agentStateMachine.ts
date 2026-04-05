import type { AgentState } from './conversationTypes.js'

const ALLOWED_TRANSITIONS: Record<AgentState, AgentState[]> = {
  idle: ['thinking'],
  thinking: ['responding', 'planning', 'error'],
  responding: ['planning', 'completed', 'awaiting_permission', 'error'],
  planning: ['awaiting_permission', 'executing', 'completed', 'error'],
  awaiting_permission: ['planning', 'executing', 'completed', 'error'],
  executing: ['completed', 'error'],
  completed: ['thinking', 'idle'],
  error: ['thinking', 'idle'],
}

export function assertAgentTransition(from: AgentState, to: AgentState): AgentState {
  if (from === to) return to
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid agent state transition: ${from} -> ${to}`)
  }
  return to
}
