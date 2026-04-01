// @ts-nocheck

export function formatFindingsForChat(findings) {
  if (!findings?.length) return 'No significant issues found.'

  const critical = findings.filter((finding) => finding.severity === 'critical')
  const warnings = findings.filter((finding) => finding.severity === 'warn')
  const info = findings.filter((finding) => finding.severity === 'info')
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

export function formatDiagnosisForChat(diagnosis) {
  if (!diagnosis?.primary) return 'Unable to determine root cause.'

  const primary = diagnosis.primary
  const confidence = Math.round(primary.probability * 100)
  let message = `Most likely: ${primary.label} (${confidence}% confidence)\n`

  if (diagnosis.notes) {
    message += `\n${diagnosis.notes}`
  }

  if (diagnosis.differential?.length) {
    message += `\n\nOther possibilities: ${diagnosis.differential
      .slice(0, 3)
      .map((entry) => `${entry.label} (${Math.round(entry.probability * 100)}%)`)
      .join(', ')}`
  }

  return message
}

export function formatFixOptionsForChat(fixOptions) {
  if (!fixOptions?.length) return 'No fix options available.'

  return fixOptions
    .map((option, index) => {
      const riskIcon =
        option.risk === 'high-impact' ? 'high' : option.risk === 'safe-write' ? 'medium' : 'low'

      return `${index + 1}. ${riskIcon} ${option.label} - ${option.why || ''}\n   Expected: ${
        option.expectedOutcome?.join(', ') || 'issue resolved'
      }`
    })
    .join('\n\n')
}

export function formatOutcomeForChat(outcome, verification) {
  const status = outcome?.status || (verification?.ok ? 'resolved' : 'unknown')
  let message = `${status.toUpperCase()}`

  if (outcome?.rootCause) {
    message += `\nRoot cause: ${outcome.rootCause}`
  }

  if (outcome?.confidence) {
    message += `\nConfidence: ${Math.round(outcome.confidence * 100)}%`
  }

  if (outcome?.preventionTips?.length) {
    message += `\n\nPrevention: ${outcome.preventionTips.join(', ')}`
  }

  return message
}

export function summarizeRinaOutput(output) {
  if (typeof output === 'string') return output
  if (!output || typeof output !== 'object') return ''

  const record = output
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  if (typeof record.summary === 'string' && record.summary.trim()) return record.summary

  if (Array.isArray(record.commands) && record.commands.length > 0) {
    return `Available commands: ${record.commands.map((value) => String(value)).join(', ')}`
  }

  if (Array.isArray(record.results) && record.results.length > 0) {
    return record.results
      .map((value) => {
        if (!value || typeof value !== 'object') return String(value)

        const item = value
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

export function normalizeRinaResponse(response) {
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
