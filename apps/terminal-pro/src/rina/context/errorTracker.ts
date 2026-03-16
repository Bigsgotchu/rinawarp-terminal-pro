/**
 * RinaWarp Error Tracker
 *
 * Tracks errors across the system for intelligent debugging.
 */

export interface TrackedError {
  id: string
  message: string
  stack?: string
  source: 'terminal' | 'agent' | 'tool' | 'system'
  timestamp: number
  context?: Record<string, any>
  resolved: boolean
}

/**
 * Error Tracker - monitors and tracks errors
 */
class ErrorTracker {
  private errors: TrackedError[] = []
  private maxErrors = 100
  private idCounter = 0

  /**
   * Record an error
   */
  record(message: string, source: TrackedError['source'] = 'system', context?: Record<string, any>): string {
    const id = `err-${++this.idCounter}`

    const error: TrackedError = {
      id,
      message,
      source,
      timestamp: Date.now(),
      context,
      resolved: false,
    }

    this.errors.push(error)

    // Trim old errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    return id
  }

  /**
   * Check output for errors and record if found
   */
  checkOutput(output: string, source: TrackedError['source'] = 'terminal'): string | null {
    // Common error patterns
    const errorPatterns = [
      /error[:\s]/i,
      /failed[:\s]/i,
      /cannot find module/i,
      /ENOENT/i,
      /ECONNREFUSED/i,
      /undefined is not a function/i,
      /TypeError:/i,
      /SyntaxError:/i,
      /ReferenceError:/i,
      /Build failed/i,
      /Test failed/i,
      /Command failed/i,
    ]

    for (const pattern of errorPatterns) {
      if (pattern.test(output)) {
        // Extract first matched line
        const lines = output.split('\n')
        const errorLine = lines.find((l) => pattern.test(l)) || output.substring(0, 100)

        return this.record(errorLine, source, { output: output.substring(0, 500) })
      }
    }

    return null
  }

  /**
   * Mark error as resolved
   */
  resolve(id: string): boolean {
    const error = this.errors.find((e) => e.id === id)
    if (error) {
      error.resolved = true
      return true
    }
    return false
  }

  /**
   * Get last error
   */
  getLast(): TrackedError | null {
    return this.errors[this.errors.length - 1] || null
  }

  /**
   * Get unresolved errors
   */
  getUnresolved(): TrackedError[] {
    return this.errors.filter((e) => !e.resolved)
  }

  /**
   * Get errors by source
   */
  getBySource(source: TrackedError['source']): TrackedError[] {
    return this.errors.filter((e) => e.source === source)
  }

  /**
   * Get recent errors
   */
  getRecent(count = 10): TrackedError[] {
    return this.errors.slice(-count)
  }

  /**
   * Get error count
   */
  count(): number {
    return this.errors.length
  }

  /**
   * Get unresolved count
   */
  unresolvedCount(): number {
    return this.errors.filter((e) => !e.resolved).length
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = []
  }

  /**
   * Get context string for AI
   */
  getContextString(): string {
    const recent = this.getUnresolved().slice(-3)
    if (recent.length === 0) return 'No unresolved errors'

    return recent
      .map((e) => {
        const time = new Date(e.timestamp).toLocaleTimeString()
        return `[${time}] ${e.source}: ${e.message}`
      })
      .join('\n')
  }
}

/**
 * Singleton instance
 */
export const errorTracker = new ErrorTracker()
