import type { ElectronApplication, Page } from 'playwright'
import { launchApp, launchPackagedApp } from './_launch'

// Helper to wait for app UI to be ready
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).RINAWARP_READY === true)
}

export async function waitForFirstWindow(app: ElectronApplication, timeoutMs = 60_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const windows = app.windows()
    if (windows.length > 0) return windows[0]
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return await app.firstWindow()
}

export async function withApp<T>(
  fn: (args: { app: ElectronApplication; page: Page }) => Promise<T>,
  extraEnv?: Record<string, string>
): Promise<T> {
  const app = await launchApp(extraEnv)
  try {
    const page = await waitForFirstWindow(app)

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

export async function withPackagedApp<T>(
  fn: (args: { app: ElectronApplication; page: Page }) => Promise<T>,
  extraEnv?: Record<string, string>
): Promise<T> {
  const app = await launchPackagedApp(extraEnv)
  try {
    const page = await waitForFirstWindow(app, 90_000)
    page.on('requestfailed', (request) => {
      console.log(`[Packaged Request Failed] ${request.url()} - ${request.failure()?.errorText}`)
    })
    page.on('console', (msg) => {
      console.log(`[Packaged Renderer ${msg.type()}]`, msg.text())
    })
    page.on('pageerror', (err) => {
      console.error(`[Packaged Renderer Error]`, err.message)
    })
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)
    return await fn({ app, page })
  } finally {
    await app.close()
  }
}
