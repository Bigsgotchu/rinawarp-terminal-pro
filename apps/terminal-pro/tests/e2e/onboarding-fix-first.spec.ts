import { expect, test } from '@playwright/test'
import { withApp } from './_app'

test('first launch steers the user toward opening a project or trying the demo', async () => {
  await withApp(async ({ page }) => {
    await page.getByRole('button', { name: 'Rina workbench' }).click()

    await expect(page.getByRole('heading', { name: 'Fix your broken project automatically.' }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Open Project' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try Demo Project' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Try Demo Project' }).first().click()

    await expect(page.locator('#status-bar')).toContainText(/Demo project ready|Click Fix Project/i, { timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Click Fix Project to repair this project.')).toBeVisible()
  })
})
