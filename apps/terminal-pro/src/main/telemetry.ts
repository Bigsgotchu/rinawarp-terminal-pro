/**
 * RinaWarp Electron Telemetry Client
 *
 * WebSocket client for sending telemetry events to the telemetry server.
 * Tracks: sessions, commands, AI messages, quick fixes, errors, crashes.
 */

import WebSocket from "ws"

const TELEMETRY_URL = process.env.TELEMETRY_WS_URL || "ws://localhost:4321"

export interface TelemetryMetrics {
  activeSessions: number
  commandsRun: number
  aiMessages: number
  quickFixes: number
  errors: number
  crashes: number
}

type TelemetryEventType =
  | "session:start"
  | "session:end"
  | "command:run"
  | "ai:message"
  | "quickfix:apply"
  | "error:occurred"
  | "crash:occurred"

type MetricsCallback = (metrics: TelemetryMetrics) => void

export interface TelemetryDispatchResult {
  accepted: boolean
  connected: boolean
  degraded?: boolean
  error?: string
}

class TelemetryClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private metricsCallback: MetricsCallback | null = null
  private isConnected = false

  /**
   * Connect to the telemetry server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    try {
      this.ws = new WebSocket(TELEMETRY_URL)

      this.ws.on("open", () => {
        console.log("[Telemetry] Connected to server")
        this.isConnected = true
        this.reconnectAttempts = 0
      })

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString())
          if (message.type === "metrics" && this.metricsCallback) {
            this.metricsCallback(message.data as TelemetryMetrics)
          }
        } catch (err) {
          console.error("[Telemetry] Failed to parse message:", err)
        }
      })

      this.ws.on("close", () => {
        console.log("[Telemetry] Disconnected from server")
        this.isConnected = false
        this.attemptReconnect()
      })

      this.ws.on("error", (err) => {
        console.error("[Telemetry] WebSocket error:", err.message)
        this.isConnected = false
      })
    } catch (err) {
      console.error("[Telemetry] Failed to connect:", err)
      this.attemptReconnect()
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[Telemetry] Max reconnect attempts reached")
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`[Telemetry] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * Send an event to the telemetry server
   */
  sendEvent(type: TelemetryEventType, payload?: Record<string, unknown>): TelemetryDispatchResult {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log("[Telemetry] Not connected, attempting to connect...")
      this.connect()
      return {
        accepted: false,
        connected: false,
        degraded: true,
        error: "Telemetry server is not connected",
      }
    }

    try {
      this.ws.send(JSON.stringify({ type, payload }))
      console.log(`[Telemetry] Event sent: ${type}`)
      return { accepted: true, connected: true }
    } catch (err) {
      console.error("[Telemetry] Failed to send event:", err)
      return {
        accepted: false,
        connected: this.isConnected,
        degraded: true,
        error: err instanceof Error ? err.message : "Failed to send telemetry event",
      }
    }
  }

  /**
   * Register a callback for metrics updates
   */
  onMetrics(callback: MetricsCallback): void {
    this.metricsCallback = callback
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected
  }

  /**
   * Disconnect from the telemetry server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }
}

// Singleton instance
let telemetryClient: TelemetryClient | null = null

/**
 * Get the telemetry client singleton
 */
export function getTelemetryClient(): TelemetryClient {
  if (!telemetryClient) {
    telemetryClient = new TelemetryClient()
    // Auto-connect on first use
    telemetryClient.connect()
  }
  return telemetryClient
}

// Export tracking functions

/**
 * Track session start
 */
export function trackSessionStart(): TelemetryDispatchResult {
  return getTelemetryClient().sendEvent("session:start")
}

/**
 * Track session end
 */
export function trackSessionEnd(): TelemetryDispatchResult {
  return getTelemetryClient().sendEvent("session:end")
}

/**
 * Track command execution
 */
export function trackCommandRun(): TelemetryDispatchResult {
  return getTelemetryClient().sendEvent("command:run")
}

/**
 * Track AI message
 */
export function trackAiMessage(): TelemetryDispatchResult {
  return getTelemetryClient().sendEvent("ai:message")
}

/**
 * Track quick fix application
 */
export function trackQuickFix(): TelemetryDispatchResult {
  return getTelemetryClient().sendEvent("quickfix:apply")
}

/**
 * Track error occurrence
 */
export function trackError(error: Error): void {
  getTelemetryClient().sendEvent("error:occurred", {
    message: error.message,
    stack: error.stack?.split("\n")[0], // Only first line of stack
    name: error.name,
  })
}

/**
 * Track crash occurrence
 */
export function trackCrash(error: Error): void {
  getTelemetryClient().sendEvent("crash:occurred", {
    message: error.message,
    stack: error.stack,
    name: error.name,
  })
}

/**
 * Subscribe to metrics updates
 */
export function onMetrics(callback: MetricsCallback): void {
  getTelemetryClient().onMetrics(callback)
}
