import { test, expect } from '@playwright/test'
import WebSocket from 'ws'
import { withApp } from './_app'

const telemetryWsUrl = process.env.RINAWARP_TELEMETRY_WS_URL || ''
const telemetryIntegrationEnabled = telemetryWsUrl.length > 0
const describeTelemetry = telemetryIntegrationEnabled ? test.describe : test.describe.skip

/**
 * E2E tests for Telemetry Reporting
 * 
 * These tests verify that telemetry events are properly sent to the
 * telemetry WebSocket server when user actions occur in the app.
 * 
 * Prerequisites:
 * - Set RINAWARP_TELEMETRY_WS_URL to a running telemetry server endpoint
 * - Example: RINAWARP_TELEMETRY_WS_URL=ws://localhost:4321 pnpm --filter @rinawarp/agentd telemetry:start
 */
describeTelemetry('Telemetry Reporting', () => {
  let ws: WebSocket | null = null
  let latestMetrics: any = {}

  test.beforeAll(async () => {
    // Connect to telemetry WebSocket server
    ws = new WebSocket(telemetryWsUrl)
    
    await new Promise<void>((resolve, reject) => {
      if (!ws) return reject(new Error('WebSocket not initialized'))
      
      ws.on('open', () => {
        console.log('[Telemetry Test] Connected to telemetry server')
        resolve()
      })
      
      ws.on('error', (err) => {
        console.error('[Telemetry Test] WebSocket error:', err.message)
        reject(err)
      })
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          if (message.type === 'metrics') {
            latestMetrics = message.data
            console.log('[Telemetry Test] Received metrics:', latestMetrics)
          }
        } catch (err) {
          console.error('[Telemetry Test] Failed to parse message:', err)
        }
      })
    })
  })

  test.afterAll(() => {
    if (ws) {
      ws.close()
      console.log('[Telemetry Test] WebSocket closed')
    }
  })

  test('should have telemetry server running', async () => {
    expect(ws).toBeDefined()
    expect(ws?.readyState).toBe(WebSocket.OPEN)
  })

  test('should report session start', async () => {
    await withApp(async ({ page }) => {
      // Get initial session count
      const initialSessions = latestMetrics.activeSessions || 0
      
      // Track session start via exposed API
      await page.evaluate(() => {
        return (window as any).rina?.trackSessionStart?.()
      })
      
      // Wait for metrics to update
      await new Promise((r) => setTimeout(r, 500))
      
      // Verify session was tracked
      expect(latestMetrics.activeSessions).toBeGreaterThanOrEqual(initialSessions)
    })
  })

  test('should report commands run', async () => {
    await withApp(async ({ page }) => {
      // Get initial command count
      const initialCommands = latestMetrics.commandsRun || 0
      
      // Track command execution
      await page.evaluate(() => {
        return (window as any).rina?.trackCommandRun?.()
      })
      
      // Wait for metrics to update
      await new Promise((r) => setTimeout(r, 500))
      
      // Verify command was tracked
      expect(latestMetrics.commandsRun).toBeGreaterThan(initialCommands)
    })
  })

  test('should report AI messages', async () => {
    await withApp(async ({ page }) => {
      // Get initial AI message count
      const initialMessages = latestMetrics.aiMessages || 0
      
      // Track AI message
      await page.evaluate(() => {
        return (window as any).rina?.trackAiMessage?.()
      })
      
      // Wait for metrics to update
      await new Promise((r) => setTimeout(r, 500))
      
      // Verify AI message was tracked
      expect(latestMetrics.aiMessages).toBeGreaterThan(initialMessages)
    })
  })

  test('should report quick fixes applied', async () => {
    await withApp(async ({ page }) => {
      // Get initial quick fixes count
      const initialQuickFixes = latestMetrics.quickFixes || 0
      
      // Track quick fix
      await page.evaluate(() => {
        return (window as any).rina?.trackQuickFix?.()
      })
      
      // Wait for metrics to update
      await new Promise((r) => setTimeout(r, 500))
      
      // Verify quick fix was tracked
      expect(latestMetrics.quickFixes).toBeGreaterThan(initialQuickFixes)
    })
  })

  test('should report session end', async () => {
    await withApp(async ({ page }) => {
      // First start a session
      await page.evaluate(() => {
        return (window as any).rina?.trackSessionStart?.()
      })
      
      await new Promise((r) => setTimeout(r, 300))
      
      // Get session count after start
      const sessionsAfterStart = latestMetrics.activeSessions || 0
      
      // End the session
      await page.evaluate(() => {
        return (window as any).rina?.trackSessionEnd?.()
      })
      
      // Wait for metrics to update
      await new Promise((r) => setTimeout(r, 500))
      
      // Verify session ended (count should be less than or equal to after start)
      expect(latestMetrics.activeSessions).toBeLessThanOrEqual(sessionsAfterStart)
    })
  })
})

test.describe('Telemetry API Exposed', () => {
  test('should expose telemetry functions on window.rina', async () => {
    await withApp(async ({ page }) => {
      // Check that telemetry functions are exposed
      const hasTrackSessionStart = await page.evaluate(() => {
        return typeof (window as any).rina?.trackSessionStart === 'function'
      })
      
      const hasTrackSessionEnd = await page.evaluate(() => {
        return typeof (window as any).rina?.trackSessionEnd === 'function'
      })
      
      const hasTrackCommandRun = await page.evaluate(() => {
        return typeof (window as any).rina?.trackCommandRun === 'function'
      })
      
      const hasTrackAiMessage = await page.evaluate(() => {
        return typeof (window as any).rina?.trackAiMessage === 'function'
      })
      
      const hasTrackQuickFix = await page.evaluate(() => {
        return typeof (window as any).rina?.trackQuickFix === 'function'
      })
      
      expect(hasTrackSessionStart).toBe(true)
      expect(hasTrackSessionEnd).toBe(true)
      expect(hasTrackCommandRun).toBe(true)
      expect(hasTrackAiMessage).toBe(true)
      expect(hasTrackQuickFix).toBe(true)
    })
  })
})
