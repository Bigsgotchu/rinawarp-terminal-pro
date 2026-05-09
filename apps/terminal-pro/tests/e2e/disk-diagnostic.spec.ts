import { test, expect } from '@playwright/test'
import { withApp } from './_app'

test.describe('Rina disk diagnostic', () => {
  test('runs read-only disk checks and gates cleanup actions', async () => {
    await withApp(
      async ({ page }) => {
        await expect(page.locator('[data-testid="rina-panel"]')).toBeVisible()

        const input = page.getByTestId('rina-chat-input')
        await input.fill('Why is my disk full?')
        await input.press('Enter')

        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText('Why is my disk full?')
        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText('read-only', { timeout: 10_000 })
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('ready', { timeout: 30_000 })
        await expect(page.locator('[data-testid="rina-chat-history"]')).toContainText('Cleanup options are ready')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('No cleanup has run')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Before:')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('measured before any cleanup approval')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('df -h')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('du -sh ~/Downloads/* 2>/dev/null | sort -h')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('docker system df')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('npm cache verify')
        await expect(page.locator('[data-testid="disk-findings"]')).toBeVisible()

        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Clean npm cache')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Remove Docker unused data')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Expected effect')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Rollback awareness')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Regenerable cache data')
        await expect(page.locator('[data-testid="rina-panel"]')).toContainText('Can be re-downloaded')

        await page.locator('[data-testid="deny-cleanup-destructive"]').click()
        await expect(page.locator('[data-testid="cleanup-state-destructive"]')).toContainText('denied')

        await page.locator('[data-testid="approve-cleanup-safe-write"]').click()
        await expect(page.locator('[data-testid="cleanup-state-safe-write"]')).toContainText(/done|error/, {
          timeout: 20_000,
        })
        await expect(page.locator('[data-testid="cleanup-state-safe-write"]')).toContainText(/After:|error/i)
      },
      {
        npm_config_cache: '/tmp/rina-e2e-npm-cache',
      }
    )
  })
})
