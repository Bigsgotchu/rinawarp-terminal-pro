import type { MemoryEntry } from './memoryTypes.js'

export function rankMemories(params: {
  items: MemoryEntry[]
  workspaceId?: string
  query?: string
}): MemoryEntry[] {
  const query = (params.query ?? '').toLowerCase()

  const score = (item: MemoryEntry): number => {
    let total = 0
    total += item.salience * 5
    total += item.confidence * 4
    if (item.status === 'approved') total += 5
    if (item.status === 'suggested') total += 1
    if (params.workspaceId && item.workspaceId === params.workspaceId) total += 7
    if (item.kind === 'constraint') total += 4
    if (item.kind === 'preference') total += 3
    if (item.kind === 'project_fact') total += 2
    if (item.kind === 'task_outcome') total += 1.5
    const haystack = `${item.content} ${item.tags.join(' ')}`.toLowerCase()
    if (query && haystack.includes(query)) total += 3
    if (item.lastUsedAt) total += 0.5
    return total
  }

  return [...params.items].sort((a, b) => score(b) - score(a))
}
