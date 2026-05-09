import type { RinaTaskKind, RinaTaskPlan } from './types.js'

export function summarizeTaskResult(input: {
  kind: RinaTaskKind
  plan: RinaTaskPlan
  summary?: string
  findings?: string[]
  hasProposedActions?: boolean
}): string {
  const findings = input.findings?.length ? `I found: ${input.findings.join(' ')}` : ''
  const actionText = input.hasProposedActions
    ? input.kind === 'disk_recovery'
      ? 'Cleanup options are ready. Review the exact command, risk, expected effect, and rollback notes before approving anything.'
      : 'Stop option is ready. Review the exact command, risk, expected effect, and rollback notes before approving anything.'
    : 'No approval-gated action is needed right now.'

  return [input.summary || input.plan.explanation, findings, actionText].filter(Boolean).join('\n\n')
}
