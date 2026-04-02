import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { launchApp } from '../tests/e2e/_launch.js'
import { waitForAppReady, waitForFirstWindow } from '../tests/e2e/_app.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createDemoWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-demo-fix-project-'))

  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'rinawarp-demo-fix-project',
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: {
          build: 'node build.mjs',
        },
        dependencies: {
          kleur: '4.1.5',
        },
      },
      null,
      2
    ),
    'utf8'
  )

  fs.writeFileSync(
    path.join(workspaceRoot, 'build.mjs'),
    [
      "import { green } from 'kleur/colors'",
      "console.log(green('Build successful'))",
      '',
    ].join('\n'),
    'utf8'
  )

  execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], {
    cwd: workspaceRoot,
    stdio: 'ignore',
  })

  fs.rmSync(path.join(workspaceRoot, 'node_modules'), { recursive: true, force: true })
  return workspaceRoot
}

async function focusMainWindow(): Promise<void> {
  try {
    execFileSync('xdotool', ['search', '--name', 'RinaWarp', 'windowactivate', '--sync'], { stdio: 'ignore' })
  } catch {
    // BrowserWindow focus is usually enough; xdotool is only a best-effort assist.
  }
}

async function main(): Promise<void> {
  const workspaceRoot = createDemoWorkspace()
  const workspaceName = path.basename(workspaceRoot)
  console.log(`[demo] workspace fixture: ${workspaceRoot}`)

  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: `demo-record-${Date.now()}`,
  })
  let page: Awaited<ReturnType<typeof waitForFirstWindow>> | null = null

  try {
    console.log('[demo] waiting for first window')
    page = await waitForFirstWindow(app, 60_000)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page, 30_000)
    console.log('[demo] renderer ready')

    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) return
      win.show()
      win.setBounds({ x: 0, y: 0, width: 1366, height: 768 })
      win.focus()
    })

    await focusMainWindow()
    await sleep(1500)

    console.log('[demo] opening Agent panel')
    await page.getByRole('button', { name: 'Agent' }).click()
    await sleep(1200)

    console.log('[demo] selecting fixture workspace')
    await page.evaluate((root) => {
      window.dispatchEvent(new CustomEvent('rina:workspace-selected', { detail: { path: root } }))
    }, workspaceRoot)

    await page.locator('#status-bar').filter({ hasText: workspaceName }).waitFor({ timeout: 15_000 })
    await sleep(1500)

    console.log('[demo] starting Fix Project')
    await page.getByText(/Fix what.s broken/i).first().click()
    await sleep(2500)

    await page.getByText(/Analyzing your project now/i).waitFor({ timeout: 30_000 })
    console.log('[demo] analysis visible')
    await sleep(2000)

    await sleep(5000)

    await page.getByText(/Project fixed successfully|Project repaired and verification completed|Project fixed/i).waitFor({
      timeout: 120_000,
    })
    console.log('[demo] repair completed')

    await sleep(4000)
    console.log('[demo] done')
  } catch (error) {
    if (page) {
      const screenshotPath = path.join(process.cwd(), 'output', 'demo-recording-error.png')
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true })
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})
      console.error(`[demo] failure screenshot: ${screenshotPath}`)
    }
    throw error
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
