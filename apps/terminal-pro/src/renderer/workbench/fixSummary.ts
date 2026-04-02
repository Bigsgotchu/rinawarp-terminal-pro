import type { FixBlockModel, FixStepModel, FixSummary } from './store.js'

function humanizeStep(step: FixStepModel): string {
  const command = String(step.command || '').toLowerCase()
  const title = String(step.title || '').toLowerCase()
  const text = `${title} ${command}`

  if (/\b(npm|pnpm|yarn|bun)\s+(install|add)\b/.test(text) || text.includes('dependenc')) {
    return 'Installed missing dependencies'
  }

  if (text.includes('tsconfig') || text.includes('config')) {
    return 'Updated project configuration'
  }

  if (/\b(build|compile|tsc|vite build|next build|webpack)\b/.test(text)) {
    return 'Resolved build errors'
  }

  if (/\b(start|dev|serve)\b/.test(text)) {
    return 'Restored development server'
  }

  return step.title || 'Applied fix'
}

function buildTitle(highlights: string[], remainingIssues: string[]): string {
  if (highlights.length === 0) {
    return 'No fixes were applied'
  }

  if (remainingIssues.length === 0) {
    return `Fixed ${highlights.length} issue${highlights.length === 1 ? '' : 's'}`
  }

  return `Partially fixed project (${highlights.length} improvement${highlights.length === 1 ? '' : 's'})`
}

export function computeFixSummary(fix: FixBlockModel): FixSummary | undefined {
  if (fix.phase !== 'done' && fix.phase !== 'error') return undefined

  const highlights = Array.from(
    new Set(
      (Array.isArray(fix.steps) ? fix.steps : [])
        .filter((step) => step.status === 'done')
        .map((step) => humanizeStep(step))
        .filter(Boolean)
    )
  )

  const remainingIssues = [
    ...(Array.isArray(fix.steps)
      ? fix.steps
          .filter((step) => step.status === 'error')
          .map((step) => `Failed: ${step.title || step.command}`)
      : []),
    ...(fix.phase === 'error' && fix.error ? [fix.error] : []),
  ].filter(Boolean)

  const verificationPassed = fix.verificationStatus === 'passed'
  const partialVerification = fix.verificationStatus === 'failed' && highlights.length > 0

  const result = verificationPassed
    ? 'Project now builds successfully.'
    : partialVerification
      ? 'Project was partially fixed, but some issues remain.'
      : 'Fix attempt did not fully succeed.'

  const confidence = fix.confidence
    ? `${fix.confidence.level.toUpperCase()} (${fix.confidence.score}%)`
    : fix.verificationStatus === 'passed'
      ? 'HIGH'
      : fix.verificationStatus === 'failed'
        ? 'LOW'
        : 'MEDIUM'

  return {
    title: buildTitle(highlights, remainingIssues),
    highlights,
    result,
    remainingIssues: remainingIssues.length > 0 ? remainingIssues : undefined,
    confidence,
  }
}

export function withFixSummary(fix: FixBlockModel): FixBlockModel {
  return {
    ...fix,
    summary: computeFixSummary(fix),
  }
}
