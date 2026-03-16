/**
 * RinaWarp Telemetry System
 *
 * Tracks usage patterns and events for product improvement.
 */

export interface TelemetryEvent {
  event: string
  data: Record<string, any>
  timestamp: number
  sessionId: string
}

/**
 * Telemetry - tracks product usage
 */
class Telemetry {
  private endpoint = 'https://api.rinawarptech.com/telemetry'
  private sessionId: string
  private enabled = true
  private queue: TelemetryEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor() {
    // Generate session ID
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Start flush interval
    this.flushInterval = setInterval(() => this.flush(), 30000)
  }

  /**
   * Track an event
   */
  async track(event: string, data: Record<string, any> = {}): Promise<void> {
    if (!this.enabled) return

    const telemetryEvent: TelemetryEvent = {
      event,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    }

    this.queue.push(telemetryEvent)

    // Flush if queue is too large
    if (this.queue.length >= 10) {
      await this.flush()
    }
  }

  /**
   * Track command execution
   */
  trackCommand(command: string, exitCode?: number): void {
    this.track('command_executed', {
      command,
      exitCode,
      timestamp: Date.now(),
    })
  }

  /**
   * Track tool usage
   */
  trackTool(tool: string, success: boolean): void {
    this.track('tool_used', { tool, success })
  }

  /**
   * Track AI request
   */
  trackAIRequest(promptLength: number, responseLength: number): void {
    this.track('ai_request', { promptLength, responseLength })
  }

  /**
   * Track error
   */
  trackError(error: string, source: string): void {
    this.track('error', { error, source })
  }

  /**
   * Track feature usage
   */
  trackFeature(feature: string): void {
    this.track('feature_used', { feature })
  }

  /**
   * Track workflow execution
   */
  trackWorkflow(name: string, steps: number, success: boolean): void {
    this.track('workflow_executed', { name, steps, success })
  }

  /**
   * Flush queue to server
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })
    } catch {
      // Re-queue on failure
      this.queue.unshift(...events)
    }
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) {
      this.flush()
    }
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Stop flush interval
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    // Final flush
    this.flush()
  }
}

/**
 * Singleton instance
 */
export const telemetry = new Telemetry()
