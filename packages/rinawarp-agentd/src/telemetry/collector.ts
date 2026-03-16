/**
 * Telemetry Collector
 *
 * Collects and sends telemetry events.
 */

import type { TelemetryEvent } from './events.js'

export interface TelemetryConfig {
  enabled: boolean
  endpoint: string
  flushIntervalMs: number
  maxQueueSize: number
}

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: false, // Opt-in by default
  endpoint: 'https://telemetry.rinawarp.tech/events',
  flushIntervalMs: 60000, // 1 minute
  maxQueueSize: 100,
}

class TelemetryCollector {
  private queue: TelemetryEvent[] = []
  private config: TelemetryConfig
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private sessionStart = Date.now()

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (this.config.enabled) {
      this.start()
    }
  }

  /**
   * Enable telemetry
   */
  enable(): void {
    this.config.enabled = true
    this.start()
  }

  /**
   * Disable telemetry
   */
  disable(): void {
    this.config.enabled = false
    this.stop()
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Start collecting
   */
  private start(): void {
    if (this.flushTimer) return

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushIntervalMs)
  }

  /**
   * Stop collecting
   */
  private stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    // Flush remaining events
    this.flush()
  }

  /**
   * Track an event
   */
  track(event: TelemetryEvent): void {
    if (!this.config.enabled) return

    this.queue.push(event)

    // Flush if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      this.flush()
    }
  }

  /**
   * Flush events to backend
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })
    } catch {
      // Silently fail - don't crash the app
      // Re-queue events on failure (up to limit)
      this.queue = [...events.slice(-this.config.maxQueueSize), ...this.queue]
    }
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    return Date.now() - this.sessionStart
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length
  }
}

// Singleton instance
let telemetryInstance: TelemetryCollector | null = null

/**
 * Get telemetry collector
 */
export function getTelemetry(): TelemetryCollector {
  if (!telemetryInstance) {
    // Check environment for opt-in
    const enabled = process.env.RINAWARP_TELEMETRY === 'true'
    telemetryInstance = new TelemetryCollector({ enabled })
  }
  return telemetryInstance
}

/**
 * Quick track function
 */
export function track(event: TelemetryEvent): void {
  getTelemetry().track(event)
}
