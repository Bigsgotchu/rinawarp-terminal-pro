type FindingSummary = {
  severity?: string
  title?: string
}

type DiagnosisSummary = {
  primary?: {
    label?: string
    probability?: number
  }
  notes?: string
  differential?: Array<{
    label?: string
    probability?: number
  }>
}

type FixOptionSummary = {
  risk?: string
  label?: string
  why?: string
  expectedOutcome?: unknown[]
}

type OutcomeSummary = {
  status?: string
  rootCause?: string
  confidence?: number
  preventionTips?: string[]
}

type VerificationSummary = {
  ok?: boolean
}

type RinaResponseLike = {
  ok: boolean
  intent?: string
  error?: string
  output?: unknown
  blocked?: boolean
  requiresConfirmation?: boolean
  [key: string]: unknown
}

export function formatFindingsForChat(findings: unknown) {
  const entries = Array.isArray(findings) ? (findings as FindingSummary[]) : []
  if (!entries.length) return 'No significant issues found.'

  const critical = entries.filter((finding) => finding.severity === 'critical')
  const warnings = entries.filter((finding) => finding.severity === 'warn')
  const info = entries.filter((finding) => finding.severity === 'info')
  const parts = []

  if (critical.length) {
    parts.push(`Critical: ${critical.map((finding) => finding.title).join(', ')}`)
  }

  if (warnings.length) {
    parts.push(`Warnings: ${warnings.map((finding) => finding.title).join(', ')}`)
  }

  if (info.length) {
    parts.push(`Info: ${info.map((finding) => finding.title).join(', ')}`)
  }

  return parts.join('\n')
}

export function formatDiagnosisForChat(diagnosis: unknown) {
  const value = diagnosis as DiagnosisSummary | null
  if (!value?.primary) return 'Unable to determine root cause.'

  const primary = value.primary
  const confidence = Math.round((primary.probability ?? 0) * 100)
  let message = `Most likely: ${primary.label} (${confidence}% confidence)\n`

  if (value.notes) {
    message += `\n${value.notes}`
  }

  if (value.differential?.length) {
    message += `\n\nOther possibilities: ${value.differential
      .slice(0, 3)
      .map((entry) => `${entry.label} (${Math.round((entry.probability ?? 0) * 100)}%)`)
      .join(', ')}`
  }

  return message
}

export function formatFixOptionsForChat(fixOptions: unknown) {
  const options = Array.isArray(fixOptions) ? (fixOptions as FixOptionSummary[]) : []
  if (!options.length) return 'No fix options available.'

  return options
    .map((option, index) => {
      const riskIcon =
        option.risk === 'high-impact' ? 'high' : option.risk === 'safe-write' ? 'medium' : 'low'

      return `${index + 1}. ${riskIcon} ${option.label} - ${option.why || ''}\n   Expected: ${
        option.expectedOutcome?.join(', ') || 'issue resolved'
      }`
    })
    .join('\n\n')
}

export function formatOutcomeForChat(outcome: unknown, verification?: unknown) {
  const outcomeValue = outcome as OutcomeSummary | null
  const verificationValue = verification as VerificationSummary | null
  const status = outcomeValue?.status || (verificationValue?.ok ? 'resolved' : 'unknown')
  let message = `${status.toUpperCase()}`

  if (outcomeValue?.rootCause) {
    message += `\nRoot cause: ${outcomeValue.rootCause}`
  }

  if (typeof outcomeValue?.confidence === 'number') {
    message += `\nConfidence: ${Math.round(outcomeValue.confidence * 100)}%`
  }

  if (outcomeValue?.preventionTips?.length) {
    message += `\n\nPrevention: ${outcomeValue.preventionTips.join(', ')}`
  }

  return message
}

export function summarizeRinaOutput(output: unknown) {
  if (typeof output === 'string') return output
  if (!output || typeof output !== 'object') return ''

  const record = output as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  if (typeof record.summary === 'string' && record.summary.trim()) return record.summary

  if (Array.isArray(record.commands) && record.commands.length > 0) {
    return `Available commands: ${record.commands
      .map((value: unknown) => String(value))
      .join(', ')}`
  }

  if (Array.isArray(record.results) && record.results.length > 0) {
    return record.results
      .map((value: unknown) => {
        if (!value || typeof value !== 'object') return String(value)

        const item = value as Record<string, unknown>
        const label =
          typeof item.command === 'string'
            ? item.command
            : typeof item.stepId === 'string'
              ? item.stepId
              : 'step'
        const status = item.success === true ? 'ok' : item.success === false ? 'failed' : 'done'
        return `${label}: ${status}`
      })
      .join('\n')
  }

  try {
    return JSON.stringify(output, null, 2)
  } catch {
    return String(output)
  }
}

export function normalizeRinaResponse(response: RinaResponseLike) {
  const output = response.output
  const plan = output && typeof output === 'object' && 'plan' in output ? output.plan : null

  return {
    ok: response.ok,
    intent: response.intent,
    text: response.error || summarizeRinaOutput(output) || (response.ok ? 'Done.' : 'Something went wrong.'),
    actions: [],
    plan,
    blocked: response.blocked ?? false,
    requiresConfirmation: response.requiresConfirmation ?? false,
    rina: response,
  }
}
