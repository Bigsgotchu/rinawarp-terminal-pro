import { expect, test } from '@playwright/test'
import { withApp } from './_app'

async function assertNoE2EWorkspace(page) {
  const workspace = await page.evaluate(() => window.rina?.workspaceDefault?.())
  expect(workspace?.source || '').not.toBe('e2e-auto')
}

test('no e2e workspace auto-select without e2e env enabled', async () => {
  await withApp(
    async ({ page }) => {
      await page.waitForTimeout(2000)
      await assertNoE2EWorkspace(page)
    },
    { RINAWARP_E2E: '0', RINAWARP_E2E_WORKSPACE: '/tmp/rinawarp-e2e-project' }
  )
})

test('no dev-only unsafe mutation chip as the default quick action', async () => {
  await withApp(async ({ page }) => {
    await page.waitForTimeout(1000)
    const mutuallyExclusive = ['Fix my project', 'Deploy', 'Fix project']
    for (const text of mutuallyExclusive) {
      const matches = page.getByRole('button', { name: text })
      expect(await matches.count()).toBe(0)
    }
  })
})

test('no credential leaks in main-process diagnostics', async () => {
  await withApp(
    async ({ page }) => {
      const bundle = await page.evaluate(async () => window.rina?.supportBundle?.())
      const text = JSON.stringify(bundle || {})
      expect(text).not.toMatch(/e2e-local-entitlement|dev-secret|test-secret|admin|password|token|RINAWARP_E2E/)
    },
    { RINAWARP_E2E: '0' }
  )
})
