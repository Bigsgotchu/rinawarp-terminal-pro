import type { FixPlanStep } from '../replies/renderPlanReplies.js'

type RendererPlanRisk = 'inspect' | 'safe-write' | 'high-impact'
type RendererRiskLevel = 'low' | 'medium' | 'high'

function inferPlanRisk(step: Partial<FixPlanStep>): RendererPlanRisk {
  if (step.requires_confirmation || step.risk_level === 'high' || step.risk === 'high-impact') return 'high-impact'
  if (step.risk_level === 'medium' || step.risk === 'safe-write') return 'safe-write'
  return 'inspect'
}

function inferRiskLevel(risk: RendererPlanRisk): RendererRiskLevel {
  if (risk === 'high-impact') return 'high'
  if (risk === 'safe-write') return 'medium'
  return 'low'
}

export function normalizePlanStep(step: FixPlanStep): FixPlanStep {
  const risk = inferPlanRisk(step)
  return {
    ...step,
    risk,
    risk_level: inferRiskLevel(risk),
    requires_confirmation: risk === 'high-impact',
  }
}

export function normalizePlanSteps(steps: FixPlanStep[]): FixPlanStep[] {
  return steps.map((step) => normalizePlanStep(step))
}

export function didExecutionStart(result: { runId?: string; code?: string; ok?: boolean } | null | undefined): boolean {
  if (!result?.runId) return false
  return result.code !== 'PLAN_HALTED' && result.code !== 'MISSING_PROJECT_ROOT' && result.code !== 'EXEC_BACKEND_UNAVAILABLE'
}

export function isExecutionPrompt(prompt: string): boolean {
  return /\b(build|test|tests|deploy|lint|fix|repair)\b/i.test(prompt)
}
