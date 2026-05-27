/**
 * Maps real runtime stream / ingress events to visible cognition labels.
 * No synthetic typing — only labels for known event types.
 */

export const RUNTIME_COGNITION_LABELS: Record<string, string> = {
  'intent.received': 'Understanding request…',
  'intent.created': 'Intent accepted…',
  'intent.resolved': 'Intent resolved…',
  'policy.checking': 'Checking safety + permissions…',
  'policy.evaluated': 'Policy evaluated…',
  'plan.generated': 'Planning next safe step…',
  'transaction.created': 'Preparing safe execution…',
  'execution.started': 'Running commands…',
  'execution.running': 'Running commands…',
  'execution.progress': 'Execution in progress…',
  'execution.completed': 'Execution complete.',
  'execution.complete': 'Execution complete.',
  'execution.failed': 'Execution failed.',
  'rollback.triggered': 'Rolling back changes…',
  'transaction.rolled_back': 'Rollback complete.',
}

export function cognitionLabelForRuntimeEvent(type: string, payload?: { plan?: string; message?: string }): string | null {
  if (type === 'plan.generated' && payload?.plan) {
    return String(payload.plan)
  }
  if (type === 'execution.progress' && payload?.message) {
    return String(payload.message)
  }
  return RUNTIME_COGNITION_LABELS[type] || null
}

export function cognitionLabelForIngressEvent(event: { type: string; [key: string]: unknown }): string | null {
  if (event.type === 'execution.progress' && typeof event.message === 'string') {
    return event.message
  }
  if (event.type === 'policy.evaluated' && typeof event.decision === 'string') {
    return `Policy: ${event.decision}`
  }
  return cognitionLabelForRuntimeEvent(event.type)
}
