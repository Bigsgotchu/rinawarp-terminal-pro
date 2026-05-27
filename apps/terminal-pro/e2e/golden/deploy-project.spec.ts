import { expect, test } from '@playwright/test'
import { withApp } from '../../tests/e2e/_app.js'
import {
  assertCanonicalThreadProofChain,
  ensureDemoProject,
  openAgentThread,
  seedGoldenThreadJourney,
} from './helpers/threadJourney.js'

test.describe('Golden journey: deploy project', () => {
  test('deploy flow shows verified receipt in thread', async () => {
    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      const runId = await seedGoldenThreadJourney(page, 'deploy')
      await assertCanonicalThreadProofChain(page, runId)
      await expect(page.locator('[data-proof-backed="true"]').first()).toBeVisible()
    })
  })
})
