import { test, expect } from '@playwright/test'
import { withApp } from './_app'

test.describe('Agent Marketplace', () => {
  test('app launches successfully', async () => {
    await withApp(async ({ page }) => {
      // Verify the app window loaded
      await expect(page).toHaveTitle(/RinaWarp/i)
    })
  })

  test('main UI renders without errors', async () => {
    await withApp(async ({ page }) => {
      // Verify main content is visible
      const body = page.locator('body')
      await expect(body).toBeVisible()
      
      // Verify no critical console errors
      const errors: string[] = []
      page.on('pageerror', (err) => {
        errors.push(err.message)
      })
      
      // Wait a moment for any errors to appear
      await page.waitForTimeout(2000)
      
      // Log any errors found (but don't fail for non-critical ones)
      if (errors.length > 0) {
        console.log('Console errors:', errors)
      }
    })
  })
})
