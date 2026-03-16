export type PlanRisk = 'read' | 'safe-write' | 'high-impact'

/**
 * Map a raw plan step from agentd/local planner into local risk semantics.
 */
export function riskFromPlanStep(rawStep: any): PlanRisk {
  if (rawStep?.confirmationScope) return 'high-impact'

  const risk = String(rawStep?.risk || '').toLowerCase()
  const riskLevel = String(rawStep?.risk_level || '').toLowerCase()

  if (risk === 'high-impact' || riskLevel === 'high') return 'high-impact'
  if (risk === 'inspect' || risk === 'read' || riskLevel === 'low') return 'read'
  if (risk === 'safe-write' || riskLevel === 'medium') return 'safe-write'

  // Preserve existing behavior for unknown steps.
  return 'safe-write'
}
