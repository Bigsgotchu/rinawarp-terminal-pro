import { expect, test } from '@playwright/test'
import { withApp } from '../../tests/e2e/_app.js'
import {
  assertCanonicalThreadProofChain,
  ensureDemoProject,
  openAgentThread,
  seedGoldenThreadJourney,
} from './helpers/threadJourney.js'

test.describe('Golden journey: run tests', () => {
  test('verified test run surfaces operational receipt', async () => {
    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      const runId = await seedGoldenThreadJourney(page, 'test')
      await assertCanonicalThreadProofChain(page, runId)
      await expect(page.locator('#agent-output [data-thread-item="receipt"]').last()).toContainText('pnpm test')
    })
  })
})
