/**
 * RinaWarp Fix UI - Inline Command Approval
 *
 * Provides interactive UI for the Autonomous Dev Fix feature.
 * Shows repair plans with inline command approval blocks.
 */

import type { RepairPlan, RepairStep } from '../rina/repair-planner'

/**
 * Render a repair plan with interactive CLI blocks
 */
export function renderRepairPlan(plan: RepairPlan): string {
  const blocks: string[] = []
  
  // Header
  blocks.push(`🎯 **Goal:** ${plan.goal}`)
  blocks.push('')
  
  // Context detected
  const ctx = plan.context
  blocks.push(`📦 **Detected:** ${ctx.type} project`)
  if (ctx.typescript) blocks.push('   - TypeScript')
  if (ctx.hasDockerfile) blocks.push('   - Docker')
  blocks.push('')
  
  // Steps
  blocks.push('📋 **Repair Plan:**')
  blocks.push('')
  
  plan.steps.forEach((step, index) => {
    const riskEmoji = step.risk === 'safe' ? '✅' : step.risk === 'medium' ? '⚠️' : '🚨'
    blocks.push(`${index + 1}. ${riskEmoji} **${step.description}**`)
    blocks.push(`   \`\`\`bash\n   ${step.command}\n   \`\`\``)
    if (step.estimatedTime) {
      blocks.push(`   ⏱ Estimated: ${step.estimatedTime}`)
    }
    blocks.push('')
  })
  
  // Errors detected
  if (plan.detectedErrors.length > 0) {
    blocks.push('🐛 **Detected Errors:**')
    plan.detectedErrors.slice(0, 3).forEach(err => {
      blocks.push(`   • \`${err}\``)
    })
    if (plan.detectedErrors.length > 3) {
      blocks.push(`   ... and ${plan.detectedErrors.length - 3} more`)
    }
    blocks.push('')
  }
  
  // Action buttons
  const autoExecutable = plan.autoExecutable
  if (autoExecutable) {
    blocks.push('🚀 **[Run All Fixes]** (auto-executable)')
  } else {
    blocks.push('⚠️ **[Run All Fixes]** (requires confirmation)')
  }
  
  return blocks.join('\n')
}

/**
 * Render a single CLI block with approve/reject buttons
 */
export function renderCLIBlock(step: RepairStep): string {
  const riskEmoji = step.risk === 'safe' ? '✅' : step.risk === 'medium' ? '⚠️' : '🚨'
  const requiresConfirmation = step.risk !== 'safe'
  
  const block = [
    `${riskEmoji} **${step.description}**`,
    '',
    '```bash',
    step.command,
    '```',
    ''
  ]
  
  if (requiresConfirmation) {
    block.push('⚠️ This command requires confirmation')
    block.push('')
  }
  
  block.push(`[▶️ Run] [📋 Copy] [❌ Skip]`)
  block.push('')
  
  return block.join('\n')
}

/**
 * Render approval prompt for dangerous commands
 */
export function renderApprovalPrompt(step: RepairStep): string {
  return `
🚨 **Command Approval Required**

Agent wants to run:
\`\`\`bash
${step.command}
\`\`\`

Category: ${step.category}
Risk: ${step.risk}

[✅ Approve] [❌ Reject]
`.trim()
}

/**
 * Render step execution result
 */
export function renderStepResult(step: RepairStep, success: boolean, output: string): string {
  const statusEmoji = success ? '✅' : '❌'
  const truncatedOutput = output.length > 500 ? output.substring(0, 500) + '...' : output
  
  return `
${statusEmoji} **${step.description}**

\`\`\`
${truncatedOutput}
\`\`\`
`.trim()
}

/**
 * Render final repair summary
 */
export function renderRepairSummary(results: Array<{ step: RepairStep; success: boolean }>): string {
  const total = results.length
  const successful = results.filter(r => r.success).length
  const failed = total - successful
  
  const lines = [
    '📊 **Repair Summary**',
    '',
    `Total steps: ${total}`,
    `✅ Successful: ${successful}`,
    failed > 0 ? `❌ Failed: ${failed}` : '',
    ''
  ]
  
  if (failed === 0) {
    lines.push('🎉 All fixes applied successfully!')
  } else {
    lines.push('⚠️ Some fixes failed. Run "rina fix" again to retry.')
  }
  
  return lines.filter(Boolean).join('\n')
}

/**
 * Parse user response for repair plan actions
 */
export function parseRepairAction(message: string): { action: 'run' | 'run-step' | 'skip' | 'copy' | 'help' | 'unknown', stepId?: string } {
  const lower = message.toLowerCase().trim()
  
  // Run all
  if (lower === 'run' || lower === 'run all' || lower === 'fix run') {
    return { action: 'run' }
  }
  
  // Run specific step
  const stepMatch = lower.match(/run\s+step\s+(\d+)/)
  if (stepMatch) {
    return { action: 'run-step', stepId: stepMatch[1] }
  }
  
  // Copy command
  if (lower.startsWith('copy')) {
    return { action: 'copy' }
  }
  
  // Skip
  if (lower === 'skip' || lower === 'next') {
    return { action: 'skip' }
  }
  
  // Help
  if (lower === 'help' || lower === '?') {
    return { action: 'help' }
  }
  
  return { action: 'unknown' }
}
