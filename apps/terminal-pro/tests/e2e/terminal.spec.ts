import { test, expect } from '@playwright/test'
import { withApp } from './_app'

test.describe('Terminal', () => {
  test('launches and terminal works', async () => {
    await withApp(async ({ page }) => {
      await expect(page.locator('[data-testid="terminal"]')).toBeVisible()
      await expect(page.locator('.xterm')).toBeVisible()
      await expect(page.locator('[data-testid="terminal"]').getByText('Terminal')).toBeVisible()
    })
  })

  test('accepts terminal input', async () => {
    await withApp(async ({ page }) => {
      await page.locator('.xterm-screen').click({ force: true })
      await page.keyboard.type('echo hello')
      await page.keyboard.press('Enter')
      await expect(page.locator('.xterm')).toContainText('hello', { timeout: 10_000 })
    })
  })

  test('pastes clipboard text into terminal', async () => {
    await withApp(async ({ page }) => {
      await page.evaluate(() => navigator.clipboard.writeText('echo pasted-from-clipboard\n'))
      await page.locator('.xterm-screen').click({ force: true })
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+V' : 'Control+Shift+V')
      await expect(page.locator('.xterm')).toContainText('pasted-from-clipboard', { timeout: 10_000 })
    })
  })
})
