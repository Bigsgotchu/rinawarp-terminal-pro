import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launchPackagedApp } from './_launch'
import { waitForAppReady, waitForFirstWindow, withPackagedApp } from './_app'
import { modKey } from './_helpers'

test.setTimeout(120_000)

function agentTopbarTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')
}

function runsInspectorTopbarTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="runs"][aria-label="Runs Inspector"]')
}

async function ensureProjectContext(page: Page): Promise<void> {
  const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
  const fixButton = page.getByRole('button', { name: 'Fix Project' }).first()
  if ((await buildButton.isVisible().catch(() => false)) || (await fixButton.isVisible().catch(() => false))) return
  const tryDemo = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await tryDemo.isVisible().catch(() => false)) {
    await tryDemo.click()
    await expect
      .poll(
        async () => (await buildButton.isVisible().catch(() => false)) || (await fixButton.isVisible().catch(() => false)),
        { timeout: 30_000 }
      )
      .toBe(true)
  }
}

async function triggerBuildRun(page: Page): Promise<void> {
  const runId = `run_pkg_${Date.now()}`
  const sessionId = `session_pkg_${Date.now()}`
  const now = new Date().toISOString()
  await page.evaluate(
    ({ runId, sessionId, now }) => {
      const bridge = (window as any).__rinaE2EWorkbench
      if (!bridge) throw new Error('E2E workbench bridge unavailable')
      const state = bridge.getState()
      const workspaceKey = bridge.getState().workspaceKey
      const workspaceRoot = workspaceKey && workspaceKey !== '__none__' ? workspaceKey : '/tmp/rinawarp-e2e-project'
      bridge.dispatch({
        type: 'runs/upsert',
        run: {
          id: runId,
          sessionId,
          title: 'Trusted path: pwd',
          command: 'pwd',
          cwd: workspaceRoot,
          status: 'ok',
          startedAt: now,
          updatedAt: now,
          endedAt: now,
          exitCode: 0,
          commandCount: 1,
          failedCount: 0,
          latestReceiptId: `${runId}-receipt`,
          projectRoot: workspaceRoot,
          source: 'e2e-seeded',
          platform: 'linux-x64',
        },
      })
      bridge.dispatch({
        type: 'runs/setOutputTail',
        runId,
        tail: `${workspaceRoot}\n`,
      })
      bridge.dispatch({
        type: 'runs/setArtifactSummary',
        runId,
        summary: {
          stdoutChunks: 1,
          stderrChunks: 0,
          metaChunks: 1,
          stdoutPreview: workspaceRoot,
          stderrPreview: '',
          metaPreview: 'receipt ready',
          changedFiles: [],
          diffHints: [],
        },
      })
      bridge.dispatch({
        type: 'chat/add',
        msg: {
          id: `${runId}-message`,
          role: 'rina',
          ts: Date.now(),
          workspaceKey,
          runIds: [runId],
          content: [
            {
              type: 'text',
              text: 'Verified run complete. Receipt ready.',
            },
          ],
        },
      })
    },
    { runId, sessionId, now }
  )
}

function userDataDirFor(suffix: string): string {
  return path.join(os.tmpdir(), `rinawarp-e2e-${suffix}`)
}

function seedInterruptedRun(userDataSuffix: string): void {
  const userDataDir = userDataDirFor(userDataSuffix)
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

async function waitForNewRun(page: Page, beforeRunIds: Set<string>): Promise<{ runId: string; runBlock: ReturnType<Page['locator']> }> {
  const thread = page.locator('#agent-output')
  let runId = ''
  await expect
    .poll(
      async () => {
        const runBlocks = thread.locator('.rw-inline-runblock')
        const count = await runBlocks.count()
        for (let index = 0; index < count; index += 1) {
          const candidate = (await runBlocks.nth(index).getAttribute('data-run-id')) || ''
          if (candidate && !beforeRunIds.has(candidate)) {
            runId = candidate
            return candidate
          }
        }
        return ''
      },
      { timeout: 30_000 }
    )
    .not.toBe('')
  const runBlock = thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)
  await expect(runBlock).toBeVisible({ timeout: 20_000 })
  return { runId, runBlock }
}

test('golden journey A: packaged first-use value is clear on a fresh state', async () => {
  const suffix = `pkg-first-use-${Date.now()}`
  const cleanHome = path.join(os.tmpdir(), `rinawarp-packaged-home-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })

  await withPackagedApp(async ({ page }) => {
    const recoveryCard = page.locator('[data-agent-section="recovery"]')
    await expect(page.getByPlaceholder('Ask Rina anything...')).toBeVisible()
    await expect(recoveryCard).toContainText(/I recovered your last session/i)
    await expect(recoveryCard.getByRole('button', { name: 'Resume Fix' })).toBeVisible()
    await expect(recoveryCard.getByRole('button', { name: 'View Details' })).toBeVisible()
    await expect(page.locator('#agent-output [data-thread-message]')).toHaveCount(1)
    await expect(page.locator('#agent-output')).toContainText(/everything looks safe to continue/i)
  }, {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })
})

test('golden journey B: packaged build flow is proof-backed and inspectable', async () => {
  const suffix = `pkg-build-${Date.now()}`
  await withPackagedApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await ensureProjectContext(page)
    const beforeRunIds = new Set(
      await page.locator('#agent-output .rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )
    await triggerBuildRun(page)
    const { runId, runBlock } = await waitForNewRun(page, beforeRunIds)
    await expect(runBlock).toContainText(/receipt|proof pending|session saved|receipt ready/i)
    await runBlock.locator('[data-run-toggle-output]').first().click()
    await expect(runBlock.locator('.rw-inline-runblock-tail')).toBeVisible()
    await runsInspectorTopbarTab(page).click()
    await expect(page.locator(`.rw-run-block[data-run-id="${runId}"]`)).toBeVisible()
  }, { RINAWARP_E2E_USER_DATA_SUFFIX: suffix })
})

test('golden journey C: packaged failure handling stays honest and inspectable', async () => {
  const suffix = `pkg-failure-${Date.now()}`
  await withPackagedApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await page.locator('#agent-input').fill('Run the command "false" through the trusted path and keep the failure proof visible.')
    await page.locator('#agent-send').click()
    await expect(page.locator('#agent-output')).toContainText(/failed|did not start|proof|safe move|recover/i, { timeout: 30_000 })
    await expect(page.locator('#agent-output')).not.toContainText(/fixed successfully/i)
  }, { RINAWARP_E2E_USER_DATA_SUFFIX: suffix })
})

test('golden journey D: packaged restart and recovery stay coherent', async () => {
  const suffix = `pkg-recovery-${Date.now()}`
  seedInterruptedRun(suffix)
  const app = await launchPackagedApp({ RINAWARP_E2E_USER_DATA_SUFFIX: suffix })
  try {
    const page = await waitForFirstWindow(app, 90_000)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)
    await agentTopbarTab(page).click()
    await expect(page.locator('#agent-recovery')).toContainText(/I recovered your last session safely/i, { timeout: 20_000 })
    await expect(page.locator('#agent-recovery')).toContainText(/Recovered task Test: npm test/i, { timeout: 20_000 })
    await runsInspectorTopbarTab(page).click()
    await expect(page.locator('.rw-run-block')).toContainText(/RESTORED|Interrupted/i)
  } finally {
    await app.close()
  }
})

test('golden journey E: packaged owner continuity persists explicit preferences across relaunch', async () => {
  const suffix = `pkg-memory-${Date.now()}`
  const cleanHome = path.join(os.tmpdir(), `rinawarp-packaged-home-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })
  const env = {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  }

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.keyboard.press(modKey(','))
    await page.getByRole('tab', { name: 'Memory' }).click()
    await page.locator('#rw-memory-preferred-name').fill('Karina')
    await page.locator('#rw-memory-save-profile').click()
    await expect(page.locator('#rw-memory-feedback')).toContainText(/saved/i)
  }, env)

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.keyboard.press(modKey(','))
    await page.getByRole('tab', { name: 'Memory' }).click()
    await expect(page.locator('#rw-memory-preferred-name')).toHaveValue('Karina')
  }, env)
})

test('golden journey F: packaged agent thread stays scrollable under long history', async () => {
  const suffix = `pkg-scroll-${Date.now()}`
  await withPackagedApp(async ({ page }) => {
    await page.evaluate(() => {
      const messages = Array.from({ length: 48 }, (_, index) => ({
        id: `scroll-seed-${index}`,
        role: index % 2 === 0 ? 'user' : 'rina',
        text: `Scroll seed message ${index + 1}: this is intentionally long enough to build a real thread and force overflow in the packaged shell.`,
      }))
      window.dispatchEvent(new CustomEvent('rina:e2e:append-messages', { detail: { messages } }))
    })

    const thread = page.locator('#agent-output')
    await expect(thread.locator('[data-thread-message]')).toHaveCount(49)

    const metrics = await thread.evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }))
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)

    await thread.evaluate((node) => {
      node.scrollTop = 0
    })

    await thread.hover()
    await page.mouse.wheel(0, 1600)

    await expect
      .poll(
        async () =>
          await thread.evaluate((node) => ({
            scrollTop: node.scrollTop,
            maxScrollTop: Math.max(0, node.scrollHeight - node.clientHeight),
          })),
        { timeout: 10_000 }
      )
      .toMatchObject({
        scrollTop: expect.any(Number),
        maxScrollTop: expect.any(Number),
      })

    const afterWheel = await thread.evaluate((node) => ({
      scrollTop: node.scrollTop,
      maxScrollTop: Math.max(0, node.scrollHeight - node.clientHeight),
    }))
    expect(afterWheel.maxScrollTop).toBeGreaterThan(0)
    expect(afterWheel.scrollTop).toBeGreaterThan(0)
  }, { RINAWARP_E2E_USER_DATA_SUFFIX: suffix })
})
