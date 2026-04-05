import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launchApp } from './_launch'
import { waitForAppReady, waitForFirstWindow, withApp } from './_app'

const VISUAL_DIR = path.resolve(process.cwd(), 'test-results', 'visual-qa')

function agentTopbarTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')
}

function runsInspectorTopbarTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="runs"][aria-label="Runs Inspector"]')
}

function diagnosticsTopbarAction(page: Page) {
  return page.locator('[data-shell-source="shell_activitybar"][data-shell-nav="diagnostics"][aria-label="Diagnostics"]')
}

function ensureVisualDir(): void {
  fs.mkdirSync(VISUAL_DIR, { recursive: true })
}

async function capture(page: Page, name: string): Promise<void> {
  ensureVisualDir()
  await page.screenshot({
    path: path.join(VISUAL_DIR, `${name}.png`),
    fullPage: true,
  })
}

function seedInterruptedRun(userDataSuffix: string): void {
  const userDataDir = path.join(os.tmpdir(), `rinawarp-e2e-${userDataSuffix}`)
  const sessionId = `session_restore_${Date.now()}`
  const commandId = `cmd_restore_${Date.now()}`
  const sessionsDir = path.join(userDataDir, 'structured-session-v1', 'sessions', sessionId)
  fs.mkdirSync(sessionsDir, { recursive: true })

  const now = new Date().toISOString()
  fs.writeFileSync(
    path.join(sessionsDir, 'session.json'),
    JSON.stringify(
      {
        id: sessionId,
        createdAt: now,
        updatedAt: now,
        machineId: 'e2e-machine',
        host: 'e2e-host',
        platform: 'linux-x64',
        source: 'e2e-seeded',
        projectRoot: '/tmp/rinawarp-e2e-project',
      },
      null,
      2
    ),
    'utf8'
  )

  fs.writeFileSync(
    path.join(sessionsDir, 'commands.ndjson'),
    `${JSON.stringify({
      id: commandId,
      session_id: sessionId,
      stream_id: 'stream_restore',
      input: 'npm test',
      shell: 'bash',
      cwd: '/tmp/rinawarp-e2e-project',
      risk: 'read',
      source: 'e2e-seeded',
      started_at: now,
    })}\n`,
    'utf8'
  )

  fs.writeFileSync(
    path.join(sessionsDir, 'artifacts.ndjson'),
    `${JSON.stringify({
      id: 'art_restore',
      command_id: commandId,
      session_id: sessionId,
      type: 'stdout_chunk',
      payload: 'Running tests before interruption...\\n',
      created_at: now,
    })}\n`,
    'utf8'
  )
}

async function openSettings(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof (window as any).__rinaSettings?.open === 'function')
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
  await expect(page.locator('#rw-settings')).toBeVisible()
}

async function ensureProjectContext(page: Page): Promise<void> {
  const tryDemo = page.getByRole('button', { name: 'Try Demo Project' }).first()
  const fixProject = page.getByRole('button', { name: 'Fix Project' }).first()
  if (await fixProject.isVisible().catch(() => false)) return
  if (await tryDemo.isVisible().catch(() => false)) {
    await tryDemo.click()
    await expect(fixProject).toBeVisible({ timeout: 30_000 })
  }
}

test('visual QA captures empty state, active thread, runs, diagnostics, and settings surfaces', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await expect(page.locator('.rw-agent-welcome-card')).toBeVisible()
    await capture(page, 'agent-empty-state')

    await ensureProjectContext(page)
    await page.getByRole('button', { name: 'Fix Project' }).first().click()
    await expect
      .poll(async () => page.locator('#agent-output .rw-thread-message').count(), { timeout: 20_000 })
      .toBeGreaterThan(0)
    await capture(page, 'agent-active-thread')

    await runsInspectorTopbarTab(page).click()
    await expect
      .poll(async () => page.locator('#runs-output .rw-run-block').count(), { timeout: 20_000 })
      .toBeGreaterThan(0)
    await capture(page, 'runs-inspector')

    await diagnosticsTopbarAction(page).click()
    await expect(page.locator('#diagnostics-output')).toContainText(/Copy workspace trust snapshot|Proof-backed runs|Verification:/)
    await capture(page, 'diagnostics-inspector')

    await openSettings(page)
    await page.locator('#rw-settings [data-settings-tab="memory"]').click()
    await capture(page, 'settings-memory')
  })
})

test('visual QA captures recovery state', async () => {
  const suffix = `visual-recovery-${Date.now()}-${Math.random().toString(16).slice(2)}`
  seedInterruptedRun(suffix)

  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await waitForFirstWindow(app)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)
    await agentTopbarTab(page).click()
    await expect(page.locator('#agent-recovery')).toContainText(/Recovered your last session/i)
    await capture(page, 'agent-recovery')
  } finally {
    await app.close()
  }
})

test('visual QA verifies skin and density variants render intentionally', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await expect(page.locator('.rw-agent-welcome-card')).toBeVisible()

    await page.evaluate(() => {
      localStorage.setItem('rinawarp-skin', 'vscode')
      localStorage.setItem('rw-skin', 'vscode')
      document.documentElement.setAttribute('data-skin', 'vscode')
    })
    await capture(page, 'agent-vscode-compact')

    await openSettings(page)
    await page.locator('[data-density-option="comfortable"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
    await page.keyboard.press('Escape')
    await capture(page, 'agent-vscode-comfortable')

    await page.evaluate(() => {
      localStorage.setItem('rinawarp-skin', 'default')
      localStorage.setItem('rw-skin', 'legacy')
      document.documentElement.setAttribute('data-skin', 'default')
    })
    await capture(page, 'agent-default-comfortable')
  })
})

test('accessibility smoke keeps focus visibility and compact hit targets usable', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const primaryWelcomeButton = page.locator('.rw-agent-welcome-card').getByRole('button', { name: 'Open Project' })
    await primaryWelcomeButton.focus()

    const focusStyles = await primaryWelcomeButton.evaluate((node) => {
      const styles = getComputedStyle(node)
      return {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
        height: Math.round(node.getBoundingClientRect().height),
      }
    })

    expect(focusStyles.outlineStyle).not.toBe('none')
    expect(parseFloat(focusStyles.outlineWidth)).toBeGreaterThanOrEqual(1)
    expect(
      parseFloat(focusStyles.outlineWidth) >= 1 || focusStyles.boxShadow !== 'none'
    ).toBe(true)
    expect(focusStyles.height).toBeGreaterThanOrEqual(24)

    await openSettings(page)
    const compactButton = page.locator('[data-density-option="compact"]')
    const comfortableButton = page.locator('[data-density-option="comfortable"]')
    const heights = await Promise.all(
      [compactButton, comfortableButton].map((locator) =>
        locator.evaluate((node) => Math.round(node.getBoundingClientRect().height))
      )
    )
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(28)
  })
})
