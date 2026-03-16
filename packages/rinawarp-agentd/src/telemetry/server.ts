/**
 * RinaWarp Telemetry Server
 *
 * WebSocket server for real-time metrics streaming.
 * Tracks: active sessions, commands run, AI messages, quick fixes.
 */

import express from "express"
import http from "http"
import { WebSocketServer, WebSocket } from "ws"

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

// In-memory metrics store
interface Metrics {
  activeSessions: number
  commandsRun: number
  aiMessages: number
  quickFixes: number
  errors: number
  crashes: number
}

let metrics: Metrics = {
  activeSessions: 0,
  commandsRun: 0,
  aiMessages: 0,
  quickFixes: 0,
  errors: 0,
  crashes: 0,
}

// Track connected clients
const clients = new Set<WebSocket>()

// Middleware for JSON parsing
app.use(express.json())

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() })
})

// Metrics REST endpoint
app.get("/metrics", (_req, res) => {
  res.json(metrics)
})

// Reset metrics endpoint (for testing)
app.post("/metrics/reset", (_req, res) => {
  metrics = {
    activeSessions: 0,
    commandsRun: 0,
    aiMessages: 0,
    quickFixes: 0,
    errors: 0,
    crashes: 0,
  }
  broadcastMetrics()
  res.json({ status: "reset", metrics })
})

// WebSocket connection handler
wss.on("connection", (ws) => {
  clients.add(ws)
  console.log(`[Telemetry] Client connected. Total clients: ${clients.size}`)

  // Send initial metrics immediately on connection
  ws.send(JSON.stringify({ type: "metrics", data: metrics }))

  ws.on("message", (message) => {
    try {
      const event = JSON.parse(message.toString())
      handleEvent(event)
    } catch (err) {
      console.error("[Telemetry] Failed to parse message:", err)
    }
  })

  ws.on("close", () => {
    clients.delete(ws)
    console.log(`[Telemetry] Client disconnected. Total clients: ${clients.size}`)
  })

  ws.on("error", (err) => {
    console.error("[Telemetry] WebSocket error:", err)
    clients.delete(ws)
  })
})

/**
 * Handle incoming telemetry events
 */
function handleEvent(event: { type: string; payload?: Record<string, unknown> }): void {
  switch (event.type) {
    case "session:start":
      metrics.activeSessions++
      console.log("[Telemetry] Session started")
      break

    case "session:end":
      metrics.activeSessions = Math.max(0, metrics.activeSessions - 1)
      console.log("[Telemetry] Session ended")
      break

    case "command:run":
      metrics.commandsRun++
      console.log("[Telemetry] Command executed")
      break

    case "ai:message":
      metrics.aiMessages++
      console.log("[Telemetry] AI message sent")
      break

    case "quickfix:apply":
      metrics.quickFixes++
      console.log("[Telemetry] Quick fix applied")
      break

    case "error:occurred":
      metrics.errors++
      console.log("[Telemetry] Error occurred:", event.payload)
      break

    case "crash:occurred":
      metrics.crashes++
      console.log("[Telemetry] Crash occurred:", event.payload)
      break

    default:
      console.log("[Telemetry] Unknown event type:", event.type)
  }

  // Broadcast updated metrics to all connected clients
  broadcastMetrics()
}

/**
 * Broadcast metrics to all connected WebSocket clients
 */
function broadcastMetrics(): void {
  const message = JSON.stringify({ type: "metrics", data: metrics })

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message)
      } catch (err) {
        console.error("[Telemetry] Failed to send to client:", err)
        clients.delete(client)
      }
    }
  })
}

// Start server
const PORT = process.env.TELEMETRY_PORT || 4321

server.listen(PORT, () => {
  console.log(`🚀 RinaWarp telemetry server running on ws://localhost:${PORT}`)
  console.log(`   REST API available at http://localhost:${PORT}/metrics`)
  console.log(`   Health check at http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Telemetry] Shutting down...")
  wss.clients.forEach((client) => {
    client.close(1000, "Server shutting down")
  })
  server.close(() => {
    console.log("[Telemetry] Server closed")
    process.exit(0)
  })
})

export { app, server, wss, metrics }
