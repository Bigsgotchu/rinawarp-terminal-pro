/**
 * RinaWarp Telemetry Dashboard
 *
 * Real-time dashboard showing telemetry metrics from the RinaWarp Terminal Pro app.
 */

import { useEffect, useState } from "react"

type Metrics = {
  activeSessions: number
  commandsRun: number
  aiMessages: number
  quickFixes: number
  errors: number
  crashes: number
}

function App() {
  const [metrics, setMetrics] = useState<Metrics>({
    activeSessions: 0,
    commandsRun: 0,
    aiMessages: 0,
    quickFixes: 0,
    errors: 0,
    crashes: 0,
  })
  const [connected, setConnected] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4321")

    ws.onopen = () => {
      console.log("Connected to telemetry server")
      setConnected(true)
      setWsError(null)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === "metrics") {
          setMetrics(message.data)
        }
      } catch (err) {
        console.error("Failed to parse message:", err)
      }
    }

    ws.onclose = () => {
      console.log("Disconnected from telemetry server")
      setConnected(false)
    }

    ws.onerror = (err) => {
      console.error("WebSocket error:", err)
      setWsError("Failed to connect to telemetry server")
    }

    return () => {
      ws.close()
    }
  }, [])

  const metricCards = [
    { label: "Active Sessions", value: metrics.activeSessions, color: "blue" },
    { label: "Commands Run", value: metrics.commandsRun, color: "green" },
    { label: "AI Messages", value: metrics.aiMessages, color: "purple" },
    { label: "Quick Fixes", value: metrics.quickFixes, color: "orange" },
    { label: "Errors", value: metrics.errors, color: "red" },
    { label: "Crashes", value: metrics.crashes, color: "red" },
  ]

  const getColorStyles = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
      green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
      purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
      orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
      red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    }
    return colors[color] || colors.blue
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#1e293b" }}>
              🚀 RinaWarp Telemetry Dashboard
            </h1>
            <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
              Real-time metrics from RinaWarp Terminal Pro
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "0.75rem",
                height: "0.75rem",
                borderRadius: "50%",
                background: connected ? "#22c55e" : "#ef4444",
              }}
            />
            <span style={{ color: connected ? "#22c55e" : "#ef4444", fontWeight: 500 }}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {wsError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              color: "#dc2626",
            }}
          >
            {wsError}. Make sure the telemetry server is running:{" "}
            <code style={{ background: "#fee2e2", padding: "0.125rem 0.375rem", borderRadius: "0.25rem" }}>
              pnpm --filter @rinawarp/agentd telemetry:start
            </code>
          </div>
        )}

        {/* Metrics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {metricCards.map((card) => {
            const styles = getColorStyles(card.color)
            return (
              <div
                key={card.label}
                style={{
                  background: "white",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  border: `1px solid ${styles.border}`,
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                }}
              >
                <p style={{ color: "#64748b", fontSize: "0.875rem", fontWeight: 500 }}>
                  {card.label}
                </p>
                <p
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: "bold",
                    color: styles.text,
                    marginTop: "0.5rem",
                  }}
                >
                  {card.value.toLocaleString()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            marginTop: "2rem",
            background: "white",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            border: "1px solid #e2e8f0",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1e293b", marginBottom: "1rem" }}>
            Quick Actions
          </h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a
              href="http://localhost:4321/metrics"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                background: "#3b82f6",
                color: "white",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              View Raw Metrics JSON
            </a>
            <a
              href="http://localhost:4321/health"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                background: "#10b981",
                color: "white",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Health Check
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "2rem",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.875rem",
          }}
        >
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default App
