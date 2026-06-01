import { expect, test } from '@playwright/test'
import { withApp } from './_app'

test('updater discoverability: version, settings, updates, and about are visible', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')

    await expect(page.getByText('RinaWarp Terminal Pro').first()).toBeVisible()
    await expect(page.locator('#rw-chrome-version')).toHaveText(/v1\.8\.2-beta/)
    await expect(page.locator('#rw-chrome-channel')).toHaveText(/stable|beta|alpha/)

    const settingsButton = page.getByRole('button', { name: 'Open settings' })
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()

    const settings = page.locator('#rw-settings')
    await expect(settings).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Updates' })).toBeVisible()

    await page.getByRole('tab', { name: 'Updates' }).click()
    await expect(page.getByRole('heading', { name: 'Updates & Trust' })).toBeVisible()
    await expect(page.locator('#rw-updates-summary')).toContainText('Current Version')
    await expect(page.locator('#rw-updates-summary')).toContainText('Channel')
    await expect(page.locator('#rw-updates-summary')).toContainText('Update Status')
    await expect(page.getByRole('button', { name: 'Check for Updates' })).toBeVisible()

    await page.getByRole('tab', { name: 'About' }).click()
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
    await expect(page.locator('#rw-about-version')).toHaveText(/1\.8\.2-beta/)
    await expect(page.locator('#rw-about-build-date')).not.toHaveText('')
    await expect(page.locator('#rw-about-platform')).not.toHaveText('')
    await expect(page.locator('#rw-about-channel')).toHaveText(/stable|beta|alpha/)
    await expect(page.getByRole('button', { name: 'Copy Version Info' })).toBeVisible()
  })
})
