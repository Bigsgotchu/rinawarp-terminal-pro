/**
 * RinaWarp Terminal History Tracker
 *
 * Tracks recent terminal commands for context awareness.
 */

export interface HistoryEntry {
  command: string
  timestamp: number
  exitCode?: number
  output?: string
}

/**
 * Terminal History - keeps track of recent commands
 */
class TerminalHistory {
  private history: HistoryEntry[] = []
  private maxEntries = 50

  /**
   * Record a command
   */
  record(command: string, exitCode?: number, output?: string): void {
    this.history.push({
      command,
      timestamp: Date.now(),
      exitCode,
      output,
    })

    // Trim old entries
    if (this.history.length > this.maxEntries) {
      this.history = this.history.slice(-this.maxEntries)
    }
  }

  /**
   * Get recent commands as string
   */
  getRecent(count = 10): string {
    const recent = this.history.slice(-count)
    return recent.map((e) => e.command).join('\n')
  }

  /**
   * Get recent history entries
   */
  getEntries(count = 10): HistoryEntry[] {
    return this.history.slice(-count)
  }

  /**
   * Get last command
   */
  getLast(): HistoryEntry | null {
    return this.history[this.history.length - 1] || null
  }

  /**
   * Get commands with errors
   */
  getErrors(): HistoryEntry[] {
    return this.history.filter((e) => e.exitCode !== undefined && e.exitCode !== 0)
  }

  /**
   * Search history
   */
  search(query: string): HistoryEntry[] {
    return this.history.filter((e) => e.command.toLowerCase().includes(query.toLowerCase()))
  }

  /**
   * Get history count
   */
  count(): number {
    return this.history.length
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = []
  }

  /**
   * Export history as JSON
   */
  export(): string {
    return JSON.stringify(this.history, null, 2)
  }

  /**
   * Get context string for AI
   */
  getContextString(): string {
    const recent = this.history.slice(-5)
    if (recent.length === 0) return 'No recent commands'

    return recent
      .map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString()
        const status = e.exitCode === 0 ? '✓' : e.exitCode ? `✗ (${e.exitCode})` : ''
        return `[${time}] ${e.command} ${status}`
      })
      .join('\n')
  }
}

/**
 * Singleton instance
 */
export const terminalHistory = new TerminalHistory()
