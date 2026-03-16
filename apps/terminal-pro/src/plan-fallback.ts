export type FallbackStepResult = {
  ok: boolean
  cancelled: boolean
  error?: string | null
}

export function haltReasonFromFallbackStep(result: FallbackStepResult): string | null {
  if (result.ok) return null
  if (result.cancelled) return 'stop_requested'
  return String(result.error || 'step_failed')
}
