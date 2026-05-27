import { expect, test } from '@playwright/test'
import { withApp } from '../../tests/e2e/_app.js'
import {
  assertCanonicalThreadProofChain,
  ensureDemoProject,
  openAgentThread,
  seedGoldenThreadJourney,
} from './helpers/threadJourney.js'

test.describe('Golden journey: memory-assisted fix', () => {
  test('memory note is subtle and execution-oriented', async () => {
    await withApp(async ({ page }) => {
      await openAgentThread(page)
      await ensureDemoProject(page)
      const runId = await seedGoldenThreadJourney(page, 'memory-fix')
      await assertCanonicalThreadProofChain(page, runId)
      const memory = page.locator('#agent-output .rw-thread-memory, #agent-output [data-thread-item="memory-note"]')
      await expect(memory).toContainText(/prior|recovery|pattern/i)
      await expect(memory).not.toContainText(/personality|friend/i)
    })
  })
})
