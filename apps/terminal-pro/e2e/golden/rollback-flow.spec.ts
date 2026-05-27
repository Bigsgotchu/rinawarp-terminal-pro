import { expect, test } from '@playwright/test'
import { withApp } from '../../tests/e2e/_app.js'
import {
  assertCanonicalThreadProofChain,
  ensureDemoProject,
  openAgentThread,
  seedGoldenThreadJourney,
} from './helpers/threadJourney.js'

test.describe('Golden journey: rollback flow', () => {
  test('rollback receipt explains restore and stays inspectable', async () => {
    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      const runId = await seedGoldenThreadJourney(page, 'rollback')
      await assertCanonicalThreadProofChain(page, runId)
      const receipt = page.locator('#agent-output [data-thread-item="receipt"]').last()
      await expect(receipt).toContainText(/rollback|rolled back|restored/i)
      await expect(receipt.locator('.rw-trust-badge.is-rolled-back, .rw-trust-badge.is-failed')).toBeVisible()
    })
  })
})
