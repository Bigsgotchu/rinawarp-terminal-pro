export type RinaStreamEvent =
  | { type: 'intent.received' }
  | { type: 'policy.checking' }
  | { type: 'plan.generated'; plan: string }
  | { type: 'transaction.created'; id: string }
  | { type: 'execution.running' }
  | { type: 'execution.complete' }
  | { type: 'rollback.triggered' }

export class RinaEventStream {
  private listeners: ((e: RinaStreamEvent) => void)[] = []

  emit(event: RinaStreamEvent) {
    this.listeners.forEach((l) => l(event))
  }

  subscribe(fn: (e: RinaStreamEvent) => void) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }
}

