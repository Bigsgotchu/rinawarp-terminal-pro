import type { RinaIntent } from '@rinawarp/rina-core'

export type RinaMemoryRecord = {
  id: string
  type: 'project' | 'decision' | 'failure' | 'pattern'
  content: unknown
  createdAt: number
  embedding?: number[]
}

export class RinaMemoryStore {
  private memories: RinaMemoryRecord[] = []

  add(record: RinaMemoryRecord) {
    this.memories.push(record)
  }

  query(filter: Partial<RinaMemoryRecord>) {
    return this.memories.filter((m) => {
      return Object.entries(filter).every(([k, v]) => (m as any)[k] === v)
    })
  }

  getRecent(limit = 20) {
    return [...this.memories]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
  }

  private failuresForIntent(intent: RinaIntent): RinaMemoryRecord[] {
    const kind = intent.kind
    const target = intent.target
    return this.memories.filter((m) => {
      if (m.type !== 'failure') return false
      const content = m.content as { intent?: Partial<RinaIntent>; error?: string } | undefined
      return (
        content?.intent?.kind === kind &&
        (target ? content?.intent?.target === target : true)
      )
    })
  }

  private successfulPatternsForIntent(intent: RinaIntent): RinaMemoryRecord[] {
    const kind = intent.kind
    const target = intent.target
    return this.memories.filter((m) => {
      if (m.type !== 'pattern') return false
      const content = m.content as { intent?: Partial<RinaIntent>; [k: string]: unknown } | undefined
      return (
        content?.intent?.kind === kind &&
        (target ? content?.intent?.target === target : true)
      )
    })
  }

  containsRepeatedFailures(intent: RinaIntent, minFailures = 2): boolean {
    return this.failuresForIntent(intent).length >= minFailures
  }

  containsSuccessfulPattern(intent: RinaIntent): boolean {
    return this.successfulPatternsForIntent(intent).length >= 1
  }

  countDecisionsForIntent(intent: Pick<RinaIntent, 'kind' | 'target'>): number {
    const kind = intent.kind
    const target = intent.target
    return this.memories.filter((m) => {
      if (m.type !== 'decision') return false
      const content = m.content as { intent?: Partial<RinaIntent> } | undefined
      return content?.intent?.kind === kind && content?.intent?.target === target
    }).length
  }
}

