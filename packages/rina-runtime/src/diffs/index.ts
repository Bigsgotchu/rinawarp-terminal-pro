/**
 * Diff engine - calculates and represents what changed
 * Diffs are first-class objects: queryable, serializable, auditable
 */

export type DiffItemType = 'added' | 'modified' | 'deleted' | 'renamed'

export interface DiffItem {
  type: DiffItemType
  path: string
  oldPath?: string // For renames
  before?: string // For modifications
  after?: string // For modifications and additions
  timestamp: number
}

export interface Diff {
  /** Unique diff ID */
  id: string
  /** Transaction this diff is for */
  transactionId: string
  /** List of changes */
  items: DiffItem[]
  /** Summary statistics */
  stats: {
    added: number
    modified: number
    deleted: number
    renamed: number
    totalLines?: number
  }
  /** When diff was calculated */
  createdAt: number
}

/**
 * Diff engine - analyzes before/after states
 */
export class DiffEngine {
  /**
   * Calculate diff between two state objects
   * before and after are key-value objects where key is path and value is content
   */
  public calculateDiff(
    transactionId: string,
    before: Record<string, string> = {},
    after: Record<string, string> = {}
  ): Diff {
    const items: DiffItem[] = []
    const now = Date.now()

    // Find added and modified
    for (const [path, afterContent] of Object.entries(after)) {
      if (!(path in before)) {
        items.push({
          type: 'added',
          path,
          after: afterContent,
          timestamp: now,
        })
      } else if (before[path] !== afterContent) {
        items.push({
          type: 'modified',
          path,
          before: before[path],
          after: afterContent,
          timestamp: now,
        })
      }
    }

    // Find deleted
    for (const [path, beforeContent] of Object.entries(before)) {
      if (!(path in after)) {
        items.push({
          type: 'deleted',
          path,
          before: beforeContent,
          timestamp: now,
        })
      }
    }

    const stats = {
      added: items.filter((i) => i.type === 'added').length,
      modified: items.filter((i) => i.type === 'modified').length,
      deleted: items.filter((i) => i.type === 'deleted').length,
      renamed: items.filter((i) => i.type === 'renamed').length,
    }

    return {
      id: `diff-${transactionId}-${Date.now()}`,
      transactionId,
      items,
      stats,
      createdAt: now,
    }
  }

  /**
   * Query diff for specific path
   */
  public getChangesForPath(diff: Diff, path: string): DiffItem[] {
    return diff.items.filter((item) => item.path === path || item.oldPath === path)
  }

  /**
   * Get only additions
   */
  public getAdditions(diff: Diff): DiffItem[] {
    return diff.items.filter((item) => item.type === 'added')
  }

  /**
   * Get only modifications
   */
  public getModifications(diff: Diff): DiffItem[] {
    return diff.items.filter((item) => item.type === 'modified')
  }

  /**
   * Get only deletions
   */
  public getDeletions(diff: Diff): DiffItem[] {
    return diff.items.filter((item) => item.type === 'deleted')
  }

  /**
   * Generate human-readable diff summary
   */
  public summarize(diff: Diff): string {
    const lines = [
      `Diff for transaction ${diff.transactionId}:`,
      `  Added: ${diff.stats.added} files`,
      `  Modified: ${diff.stats.modified} files`,
      `  Deleted: ${diff.stats.deleted} files`,
      `  Renamed: ${diff.stats.renamed} files`,
    ]

    if (diff.items.length > 0) {
      lines.push('\nChanges:')
      for (const item of diff.items.slice(0, 10)) {
        // Show first 10
        lines.push(`  ${item.type}: ${item.path}`)
      }
      if (diff.items.length > 10) {
        lines.push(`  ... and ${diff.items.length - 10} more`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Convert diff to JSON for storage/transmission
   */
  public toJSON(diff: Diff): string {
    return JSON.stringify(diff, null, 2)
  }

  /**
   * Parse diff from JSON
   */
  public fromJSON(json: string): Diff {
    return JSON.parse(json) as Diff
  }
}

export const diffs = {
  DiffEngine,
}
