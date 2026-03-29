import { expect, test } from '@playwright/test'
import { withApp } from './_app'
import { modKey } from './_helpers'

test('Updates settings supports channel config and release checks', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.keyboard.press(modKey(','))
    await page.getByRole('tab', { name: 'Updates' }).click()

    await expect(page.getByRole('heading', { name: 'Updates & Trust' })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Stable/ })).toBeChecked()

    await page.getByRole('radio', { name: /Stable/ }).check()
    await page.getByRole('button', { name: 'Save Settings' }).click()
    await expect(page.locator('#rw-updates-status')).toContainText('Settings saved.')

    await page.getByRole('button', { name: 'Check for Updates' }).click()
    await expect(page.locator('#rw-updates-status')).toContainText(
      /latest version|update available|manual update only|downloaded|downloading|disabled in development/i
    )

    await page.getByRole('button', { name: 'Verify Release' }).click()
    await expect(page.locator('#rw-updates-status')).toContainText(
      /informational only|no direct signature or checksum verification was performed in-app|verified|managed|failed/i
    )
    await expect(page.locator('#rw-updates-release')).toContainText(/Current Release|Trust & Verification/)
    await expect(page.locator('#rw-updates-runtime')).toContainText(/Runtime Status|Auto updates/)
  })
})
