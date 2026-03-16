import type { ElectronApplication, Page } from 'playwright'
import { launchApp } from './_launch'

// Helper to wait for app UI to be ready
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).RINAWARP_READY === true)
}

export async function withApp<T>(fn: (args: { app: ElectronApplication; page: Page }) => Promise<T>): Promise<T> {
  const app = await launchApp()
  try {
    const page = await app.firstWindow()

    // Listen for failed requests
    page.on('requestfailed', (request) => {
      console.log(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`)
    })

    // Listen for console messages from the renderer
    page.on('console', (msg) => {
      console.log(`[Renderer ${msg.type()}]`, msg.text())
    })

    // Listen for page errors
    page.on('pageerror', (err) => {
      console.error(`[Renderer Error]`, err.message)
    })

    await page.waitForLoadState('domcontentloaded')
    // Wait for renderer initialization
    await waitForAppReady(page)
    return await fn({ app, page })
  } finally {
    await app.close()
  }
}
