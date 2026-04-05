/**
 * RinaWarp IPC Full Smoke Tests
 * 
 * These tests verify the core IPC communication between the renderer
 * and main process works correctly. They require the Electron app to be
 * running and are designed to be executed via Playwright.
 * 
 * Usage:
 *   - Via Playwright: pnpm test:playwright
 *   - Individual: pnpm exec playwright test tests/e2e/rina-ipc-full-smoke.test.ts
 */

import { test, expect } from '@playwright/test'

const { describe } = test
import { withApp } from './_app'

describe('RinaWarp IPC Smoke Tests', () => {
  test.describe('Core IPC Channels', () => {
    test('should call rina:getStatus', async () => {
      await withApp(async ({ page }) => {
        const status = await page.evaluate(() => (window as any).rina.getStatus())
        expect(status).toBeDefined()
        expect(status.mode).toBeDefined()
        expect(typeof status.workspaceRoot).toBe('string')
        expect(Array.isArray(status.activePlans)).toBe(true)
      })
    })

    test('should call rina:getMode', async () => {
      await withApp(async ({ page }) => {
        const mode = await page.evaluate(() => (window as any).rina.getMode())
        expect(mode).toBeDefined()
        expect(['auto', 'assist', 'explain']).toContain(mode)
      })
    })

    test('should call rina:setMode', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() => (window as any).rina.setMode('assist'))
        expect(result).toBeDefined()
        expect(result.ok).toBe(true)
        expect(result.mode).toBe('assist')
      })
    })

    test('should call rina:runAgent', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() => 
          (window as any).rina.runAgent('echo test')
        )
        expect(result).toBeDefined()
        expect(typeof result.ok).toBe('boolean')
      })
    })

    test('should call rina:getTools', async () => {
      await withApp(async ({ page }) => {
        const tools = await page.evaluate(() => (window as any).rina.getTools())
        expect(tools).toBeDefined()
        expect(Array.isArray(tools)).toBe(true)
      })
    })

    test('should call rina:getPlans', async () => {
      await withApp(async ({ page }) => {
        const plans = await page.evaluate(() => (window as any).rina.getPlans())
        expect(plans).toBeDefined()
        expect(Array.isArray(plans)).toBe(true)
      })
    })
  })

  test.describe('Telemetry IPC', () => {
    test('should call telemetry:sessionStart', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() => 
          (window as any).rina.trackSessionStart()
        )
        expect(result).toBeDefined()
        expect(typeof result.ok).toBe('boolean')
        expect(typeof result.accepted).toBe('boolean')
        expect(typeof result.connected).toBe('boolean')
        expect(result.event).toBe('session:start')
      })
    })

    test('should call telemetry:sessionEnd', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() => 
          (window as any).rina.trackSessionEnd()
        )
        expect(result).toBeDefined()
        expect(typeof result.ok).toBe('boolean')
        expect(typeof result.accepted).toBe('boolean')
        expect(typeof result.connected).toBe('boolean')
        expect(result.event).toBe('session:end')
      })
    })
  })

  test.describe('Analytics IPC', () => {
    test('should call analytics:trackEvent', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.trackEvent?.('renderer_boot_timing', { source: 'smoke' })
        )
        expect(result).toBeDefined()
        expect(typeof result.ok).toBe('boolean')
        expect(typeof result.accepted).toBe('boolean')
        expect(typeof result.enabled).toBe('boolean')
        expect(result.event).toBe('renderer_boot_timing')
      })
    })

    test('should call rina:analytics:funnel', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.trackFunnelStep?.('first_run', { source: 'smoke' })
        )
        expect(result).toBeDefined()
        expect(typeof result.ok).toBe('boolean')
        expect(typeof result.accepted).toBe('boolean')
        expect(typeof result.enabled).toBe('boolean')
        expect(result.event).toBe('funnel:first_run')
      })
    })
  })

  test.describe('Marketplace IPC', () => {
    test('should call secure-agent:marketplace', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.marketplaceList?.()
        )
        expect(result).toBeDefined()
        expect(result.ok).toBe(true)
        expect(Array.isArray(result.agents)).toBe(true)
        expect(typeof result.degraded).toBe('boolean')
        expect(['remote', 'fallback', undefined]).toContain(result.source)
      })
    })

    test('should call rina:capabilities:list', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.capabilityPacks?.()
        )
        expect(result).toBeDefined()
        expect(result.ok).toBe(true)
        expect(Array.isArray(result.capabilities)).toBe(true)
        expect(typeof result.degraded).toBe('boolean')
        expect(['remote', 'fallback', undefined]).toContain(result.source)
      })
    })
  })

  test.describe('Update IPC', () => {
    test('should call app:updateState', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.updateState?.()
        )
        expect(result).toBeDefined()
        expect(typeof result.status).toBe('string')
        expect(typeof result.supported).toBe('boolean')
        expect(typeof result.installReady).toBe('boolean')
      })
    })

    test('should call app:verifyRelease', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.verifyRelease?.()
        )
        expect(result).toBeDefined()
        expect(typeof result.ok).toBe('boolean')
        expect(typeof result.performed).toBe('boolean')
        expect(typeof result.degraded).toBe('boolean')
      })
    })
  })

  test.describe('Team IPC', () => {
    test('should call team:state and team:plan', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(async () => {
          const rina = (window as any).rina
          return {
            state: await rina.teamState?.(),
            plan: await rina.teamPlan?.(),
          }
        })
        expect(result.state).toBeDefined()
        expect(typeof result.state.ok).toBe('boolean')
        expect(Array.isArray(result.state.members)).toBe(true)
        expect(result.plan).toBeDefined()
        expect(typeof result.plan.ok).toBe('boolean')
      })
    })

    test('should reject empty team workspace id', async () => {
      await withApp(async ({ page }) => {
        const result = await page.evaluate(() =>
          (window as any).rina.teamWorkspaceSet?.('')
        )
        expect(result).toBeDefined()
        expect(result.ok).toBe(false)
        expect(result.error).toBe('workspace_id_required')
      })
    })
  })

  test.describe('RINAWARP_READY Flag', () => {
    test('should set RINAWARP_READY flag after app load', async () => {
      await withApp(async ({ page }) => {
        const isReady = await page.evaluate(() => (window as any).RINAWARP_READY)
        expect(isReady).toBe(true)
      })
    })
  })
})
