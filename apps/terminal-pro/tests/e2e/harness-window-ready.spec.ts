import { expect, test } from '@playwright/test'
import { waitForAppReady, waitForFirstWindow } from './_app'
import { launchApp } from './_launch'

test('Electron harness opens a BrowserWindow and reaches renderer ready', async () => {
  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: `harness-window-ready-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  })

  try {
    const page = await waitForFirstWindow(app)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)

    const mainState = await app.evaluate(({ app: electronApp, BrowserWindow }) => ({
      appReady: electronApp.isReady(),
      windowCount: BrowserWindow.getAllWindows().length,
    }))

    expect(mainState.appReady).toBe(true)
    expect(mainState.windowCount).toBeGreaterThan(0)
    await expect(page.locator('body')).toBeVisible()

    const readySnapshot = await page.evaluate(() => ({
      pathname: location.pathname,
      ready: (window as { RINAWARP_READY?: boolean }).RINAWARP_READY === true,
    }))

    expect(readySnapshot.ready).toBe(true)
    expect(readySnapshot.pathname).toBeTruthy()
  } finally {
    await app.close()
  }
})
