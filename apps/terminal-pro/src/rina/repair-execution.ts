import { execCommand } from './execution/legacyShell.js'
import type { RepairPlan, RepairStep } from './repair-planner.js'

export async function executeRepairStep(
  step: RepairStep,
  projectRoot: string,
  dryRun: boolean = false
): Promise<{ success: boolean; output: string; error?: string }> {
  if (dryRun) {
    return {
      success: true,
      output: `[Dry Run] Would execute: ${step.command}`,
    }
  }

  try {
    const { stdout, stderr } = await execCommand(step.command, {
      cwd: projectRoot,
      timeout: 300000,
      env: { ...process.env, FORCE_COLOR: 'true' },
    })

    return {
      success: true,
      output: stdout + stderr,
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
    }
  }
}

export async function executeRepairPlan(
  plan: RepairPlan,
  projectRoot: string,
  onStepComplete?: (step: RepairStep, result: { success: boolean; output: string }) => void
): Promise<{ success: boolean; results: Array<{ step: RepairStep; result: { success: boolean; output: string } }> }> {
  const results: Array<{ step: RepairStep; result: { success: boolean; output: string } }> = []

  for (const step of plan.steps) {
    const result = await executeRepairStep(step, projectRoot)
    results.push({ step, result })

    if (onStepComplete) {
      onStepComplete(step, result)
    }

    if (!result.success) {
      return {
        success: false,
        results,
      }
    }
  }

  return {
    success: true,
    results,
  }
}

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
    plan.autoExecutable ? 'This plan can be executed automatically.' : 'Some steps require manual confirmation.'
  )

  return lines.join('\n')
}
