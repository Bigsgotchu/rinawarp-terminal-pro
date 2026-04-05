import { test, expect } from '@playwright/test'
import { withApp } from './_app'

test('Electron IPC is ready', async () => {
  await withApp(async ({ page }) => {
    const status = await page.evaluate(() => (window as any).rina.getStatus())
    expect(status).toBeDefined()
  })
})
