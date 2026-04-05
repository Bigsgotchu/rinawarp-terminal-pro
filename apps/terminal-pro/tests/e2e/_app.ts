import type { ElectronApplication, Page } from 'playwright'
import { launchApp, launchPackagedApp } from './_launch'

// Helper to wait for app UI to be ready
export async function waitForAppReady(page: Page, timeoutMs = 30_000): Promise<void> {
  try {
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true, null, { timeout: timeoutMs })
  } catch (error) {
    const snapshot = await page
      .evaluate(() => ({
        readyState: document.readyState,
        rinaReady: (window as any).RINAWARP_READY === true,
        pathname: location.pathname,
      }))
      .catch(() => ({ readyState: 'unknown', rinaReady: false, pathname: 'unknown' }))
    throw new Error(
      `Renderer never reached RINAWARP_READY within ${timeoutMs}ms: ${JSON.stringify(snapshot)}${error instanceof Error ? ` (${error.message})` : ''}`
    )
  }
}

async function getMainProcessWindowState(
  app: ElectronApplication
): Promise<{ appReady: boolean; windowCount: number; milestones: string[]; windowPhase: string; appPath: string; memoryPhase: string }> {
  try {
    return await app.evaluate(({ app: electronApp, BrowserWindow }) => ({
      appReady: electronApp.isReady(),
      windowCount: BrowserWindow.getAllWindows().length,
      milestones:
        typeof process.env.RINAWARP_E2E_BOOT_MILESTONES === 'string' && process.env.RINAWARP_E2E_BOOT_MILESTONES
          ? process.env.RINAWARP_E2E_BOOT_MILESTONES.split(' > ')
          : [],
      windowPhase: process.env.RINAWARP_E2E_WINDOW_PHASE || '',
      appPath: electronApp.getAppPath(),
      mainLoaded: process.env.RINAWARP_E2E_MAIN_LOADED === '1',
      memoryPhase: process.env.RINAWARP_E2E_MEMORY_PHASE || '',
    }))
  } catch {
    return { appReady: false, windowCount: -1, milestones: [], windowPhase: '', appPath: '', mainLoaded: false, memoryPhase: '' }
  }
}

export async function waitForFirstWindow(app: ElectronApplication, timeoutMs = 60_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs
  let lastWindowState = { appReady: false, windowCount: -1, milestones: [] as string[], windowPhase: '', appPath: '', mainLoaded: false, memoryPhase: '' }
  let lastLoggedAt = 0

  while (Date.now() < deadline) {
    const windows = app.windows()
    if (windows.length > 0) return windows[0]
    lastWindowState = await getMainProcessWindowState(app)
    if (lastWindowState.windowCount > 0) {
      try {
        return await app.firstWindow({ timeout: 2_000 })
      } catch {
        // Keep polling until Playwright attaches to the existing window.
      }
    }
    if (Date.now() - lastLoggedAt >= 5_000) {
      console.log(
        `[E2E boot] waiting for first window: playwright=${windows.length} main=${lastWindowState.windowCount} appReady=${lastWindowState.appReady} milestones=${lastWindowState.milestones.join(' > ')}`
          + ` windowPhase=${lastWindowState.windowPhase || 'unknown'} memoryPhase=${lastWindowState.memoryPhase || 'unknown'} appPath=${lastWindowState.appPath || 'unknown'} mainLoaded=${lastWindowState.mainLoaded}`
      )
      lastLoggedAt = Date.now()
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `Timed out waiting for first Electron window after ${timeoutMs}ms (playwright=0, main=${lastWindowState.windowCount}, appReady=${lastWindowState.appReady}, milestones=${lastWindowState.milestones.join(' > ')}, windowPhase=${lastWindowState.windowPhase || 'unknown'}, memoryPhase=${lastWindowState.memoryPhase || 'unknown'}, appPath=${lastWindowState.appPath || 'unknown'}, mainLoaded=${lastWindowState.mainLoaded})`
  )
}

export async function withApp<T>(
  fn: (args: { app: ElectronApplication; page: Page }) => Promise<T>,
  extraEnv?: Record<string, string>
): Promise<T> {
  const app = await launchApp(extraEnv)
  try {
    const electronProcess = typeof (app as any).process === 'function' ? (app as any).process() : null
    console.log(`[E2E boot] electron child process bridge ${electronProcess ? 'available' : 'missing'}`)
    if (electronProcess?.stdout) {
      electronProcess.stdout.on('data', (chunk: Buffer | string) => {
        const text = String(chunk).trim()
        if (text) console.log(`[Main stdout] ${text}`)
      })
    }
    if (electronProcess?.stderr) {
      electronProcess.stderr.on('data', (chunk: Buffer | string) => {
        const text = String(chunk).trim()
        if (text) console.error(`[Main stderr] ${text}`)
      })
    }
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
    const electronProcess = typeof (app as any).process === 'function' ? (app as any).process() : null
    console.log(`[E2E packaged boot] electron child process bridge ${electronProcess ? 'available' : 'missing'}`)
    if (electronProcess?.stdout) {
      electronProcess.stdout.on('data', (chunk: Buffer | string) => {
        const text = String(chunk).trim()
        if (text) console.log(`[Packaged Main stdout] ${text}`)
      })
    }
    if (electronProcess?.stderr) {
      electronProcess.stderr.on('data', (chunk: Buffer | string) => {
        const text = String(chunk).trim()
        if (text) console.error(`[Packaged Main stderr] ${text}`)
      })
    }
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
