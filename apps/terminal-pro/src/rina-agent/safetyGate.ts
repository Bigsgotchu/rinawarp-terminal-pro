import type { RinaCommandPlan } from './types.js'

export function applySafety(plan: RinaCommandPlan): RinaCommandPlan {
  return {
    ...plan,
    requiresApproval: plan.risk !== 'read',
  }
}

export function applySafetyToPlans(plans: RinaCommandPlan[]): RinaCommandPlan[] {
  return plans.map(applySafety)
}
