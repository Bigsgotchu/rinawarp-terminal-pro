/**
 * Rina Controller Types
 *
 * Type placeholders for the Rina Controller stub.
 * Based on the actual types from agent-loop.ts for compatibility.
 */

/**
 * Represents an agent execution plan
 */
export interface AgentPlan {
  id: string
  description: string
  steps: string[]
  goal?: string
}

/**
 * Agent events - matching agent-loop.ts
 */
export type AgentEvent =
  | { type: 'planning'; goal: string }
  | { type: 'plan-created'; plan: AgentPlan }
  | { type: 'step-starting'; step: unknown }
  | { type: 'step-completed'; step: unknown }
  | { type: 'step-failed'; step: unknown }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'completed'; results: unknown[] }
  | { type: 'error'; error: string }
  | { type: 'stepStarted'; step?: string }
  | { type: 'stepCompleted'; step?: string }
  | { type: 'thinking'; message?: string }

/**
 * Reflection result
 */
export interface ReflectionResult {
  insights: { feedback: string[] }[]
  nextActions: string[]
  summary: string
}

/**
 * Status returned by getStatus()
 */
export interface RinaStatus {
  isRunning: boolean
  mode: 'auto' | 'assist' | 'explain'
  activePlans: AgentPlan[]
}

/**
 * Result of running the agent
 */
export interface AgentRunResult {
  reflection: string
  success: boolean
  summary: {
    totalSteps: number
    successfulSteps: number
    failedSteps: number
    durationMs: number
  }
  insights?: { feedback: string[] }[]
  nextActions?: string[]
  ok: boolean
}

/**
 * License verification result
 */
export interface LicenseResult {
  valid: boolean
  message?: string
}
