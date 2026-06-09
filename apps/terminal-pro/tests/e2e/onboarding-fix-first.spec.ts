import { expect, test } from '@playwright/test'
import { withApp } from './_app'

test('first launch steers the user toward opening a project or trying the demo', async () => {
  await withApp(async ({ page }) => {
    await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]').click()

    await expect(page.getByRole('heading', { name: 'Fix your broken project automatically.' }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Open Project' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try Demo Project' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Try Demo Project' }).first().click()

    await expect(page.locator('#status-bar')).toContainText(/Demo project ready|Build project|Run tests|Plan a fix/i, { timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Plan a fix' }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Fix Project' })).toHaveCount(0)
  })
})
