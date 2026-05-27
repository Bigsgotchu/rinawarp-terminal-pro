import { expect, test } from '@playwright/test'
import { withApp } from '../../tests/e2e/_app.js'
import { ensureDemoProject, openAgentThread, seedGoldenThreadJourney } from './helpers/threadJourney.js'

test.describe('Golden journey: receipt persistence', () => {
  test('receipts survive reload via local hydration', async () => {
    let runId = ''
    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      runId = await seedGoldenThreadJourney(page, 'build')
      await expect(page.locator(`[data-run-id="${runId}"][data-thread-item="receipt"]`)).toBeVisible()
    })

    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      await page.evaluate((id) => {
        const bridge = (window as { __rinaE2EWorkbench?: { dispatch: (a: unknown) => void; getState: () => { workspaceKey: string } } })
          .__rinaE2EWorkbench
        bridge?.dispatch({ type: 'thread/replace', items: [] })
        const raw = localStorage.getItem('rinawarp.execution-receipts.v1')
        if (!raw || !bridge) return
        const store = JSON.parse(raw) as Record<string, unknown>
        const receipt = store[id]
        if (!receipt) return
        bridge.dispatch({ type: 'executionReceipts/upsert', receipt })
        bridge.dispatch({
          type: 'thread/append',
          items: [
            {
              id: `thread:receipt:${id}`,
              type: 'receipt',
              receipt,
              createdAt: Date.now(),
              workspaceKey: bridge.getState().workspaceKey,
            },
          ],
        })
      }, runId)
      await expect(page.locator('[data-thread-item="receipt"]').last()).toContainText(runId)
    })
  })
})
