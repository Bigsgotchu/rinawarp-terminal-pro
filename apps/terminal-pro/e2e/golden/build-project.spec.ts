import { test } from '@playwright/test'
import { withApp } from '../../tests/e2e/_app.js'
import {
  assertCanonicalThreadProofChain,
  ensureDemoProject,
  openAgentThread,
  seedGoldenThreadJourney,
} from './helpers/threadJourney.js'

test.describe('Golden journey: build project', () => {
  test('thread shows plan, cognition, run block, receipt, and verification', async () => {
    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      const runId = await seedGoldenThreadJourney(page, 'build')
      await assertCanonicalThreadProofChain(page, runId)
    })
  })
})
