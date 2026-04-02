import type { FixBlockModel, FixConfidenceLevel, FixConfidenceScore, FixConfidenceSignals } from './store.js'

function collectSignals(fix: FixBlockModel): FixConfidenceSignals {
  const steps = Array.isArray(fix.steps) ? fix.steps : []
  const stepsSucceeded = steps.filter((step) => step.status === 'done').length
  const stepsFailed = steps.filter((step) => step.status === 'error').length
  const verificationPassed = fix.verificationStatus === 'passed'
  const partialVerification = fix.verificationStatus === 'failed' && stepsSucceeded > 0
  const highImpactSkipped =
    fix.phase === 'done' || fix.phase === 'error'
      ? steps.filter((step) => step.risk === 'dangerous' && step.status !== 'done').length
      : 0
  const errorsDetected = (fix.error ? 1 : 0) + (stepsFailed > 0 ? 1 : 0)

  return {
    stepsSucceeded,
    stepsFailed,
    verificationPassed,
    partialVerification,
    highImpactSkipped,
    errorsDetected,
  }
}

export function computeFixConfidence(fix: FixBlockModel): FixConfidenceScore | undefined {
  if (fix.phase !== 'done' && fix.phase !== 'error' && fix.phase !== 'verifying') return undefined

  const signals = collectSignals(fix)
  let score = 100
  const reasons: string[] = []

  if (signals.stepsFailed > 0) {
    score -= 25
    reasons.push(`${signals.stepsFailed} repair step${signals.stepsFailed === 1 ? '' : 's'} failed`)
  }

  if (!signals.verificationPassed) {
    if (signals.partialVerification) {
      score -= 20
      reasons.push('Verification only partially cleared')
    } else {
      score -= 40
      reasons.push('Verification did not clear')
    }
  }

  if (signals.highImpactSkipped > 0) {
    score -= 15
    reasons.push(`${signals.highImpactSkipped} high-impact step${signals.highImpactSkipped === 1 ? '' : 's'} were skipped`)
  }

  if (signals.errorsDetected > 0) {
    score -= 20
    reasons.push('Errors were detected during execution')
  }

  score = Math.max(0, Math.min(100, score))

  let level: FixConfidenceLevel = 'high'
  if (score < 80) level = 'medium'
  if (score < 50) level = 'low'

  if (reasons.length === 0) {
    if (signals.stepsSucceeded > 0) reasons.push('All repair steps completed successfully')
    if (signals.verificationPassed) reasons.push('Verification passed with proof attached')
    if (reasons.length === 0) reasons.push('No negative repair signals were detected')
  }

  return {
    level,
    score,
    reasons,
    signals,
  }
}

export function withFixConfidence(fix: FixBlockModel): FixBlockModel {
  return {
    ...fix,
    confidence: computeFixConfidence(fix),
  }
}
