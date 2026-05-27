import type { RepairPlan } from './repair-planner.js'

/** Pure formatting — no execution. */
export function formatRepairPlan(plan: RepairPlan): string {
  const lines: string[] = []

  lines.push(`Goal: ${plan.goal}`)
  lines.push('')
  lines.push('Repair Plan:')
  lines.push('')

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    const riskEmoji = step.risk === 'safe' ? 'OK' : step.risk === 'medium' ? 'WARN' : 'HIGH'
    lines.push(`${i + 1}. ${riskEmoji} ${step.description}`)
    lines.push(`   Command: \`${step.command}\``)
    if (step.estimatedTime) {
      lines.push(`   Estimated time: ${step.estimatedTime}`)
    }
    lines.push('')
  }

  if (plan.detectedErrors.length > 0) {
    lines.push('Detected Errors:')
    for (const error of plan.detectedErrors.slice(0, 5)) {
      lines.push(`   - ${error}`)
    }
    if (plan.detectedErrors.length > 5) {
      lines.push(`   ... and ${plan.detectedErrors.length - 5} more`)
    }
    lines.push('')
  }

  lines.push(
    plan.autoExecutable ? 'This plan can be executed via runtime (rina fix-run).' : 'Some steps require manual confirmation.',
  )

  return lines.join('\n')
}
