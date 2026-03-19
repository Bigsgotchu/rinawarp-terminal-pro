import { expect, test } from '@playwright/test'
import { withApp } from './_app'

test('live terminal path: submitting input creates a terminal block', async () => {
  await withApp(async ({ page }) => {
    await page.getByRole('button', { name: 'Terminal', exact: true }).click()
    await expect(page.locator('[data-view="terminal"].active')).toBeVisible()

    const input = page.getByTestId('terminal-input')
    await expect(input).toBeVisible()

    await input.fill('echo hello from playwright')
    await input.press('Enter')

    const terminalOutput = page.getByTestId('terminal-output')
    await expect(terminalOutput.locator('.tb').first()).toBeVisible({ timeout: 15000 })
    await expect(terminalOutput).toContainText('echo hello from playwright')
  })
})
