import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { launchApp } from './_launch'
import { waitForAppReady, waitForFirstWindow, withApp } from './_app'

function agentTopbarTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')
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

test('agent empty state shows safe setup UI before a project is selected', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()

    await expect(page.locator('.rw-agent-launch-title')).toHaveText('RinaWarp Terminal Pro', { timeout: 15_000 })
    await expect(page.locator('.rw-agent-launch-subtitle')).toHaveText('What would you like me to do?')
    await expect(page.locator('#agent-input')).toBeVisible()
    await expect(page.locator('#agent-input')).toHaveAttribute('placeholder', 'Choose a project folder to give Rina safe context.')
    await expect(page.locator('#agent-send')).toBeVisible()

    const starterPrompts = page.locator('#agent-starter-prompts .rw-prompt-chip')
    await expect(starterPrompts).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Build project' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Run tests' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Inspect workspace' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Plan a fix' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Browse Marketplace/i })).toBeVisible()

    await expect(page.locator('#status-bar')).toBeHidden()
    await expect(page.locator('#workspace-picker')).toBeHidden()
    await expect(page.locator('.rw-agent-welcome-card')).toHaveCount(0)
    await expect(page.locator('#panel-execution-trace .rw-execution-trace-empty')).toHaveCount(0)
    await expect(page.locator('#agent-output .rw-thread-message')).toHaveCount(0)
  })
})

test('agent launch scaffolding collapses after the thread becomes active', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await expect(page.locator('.rw-agent-launch-title')).toBeVisible()

    await page.locator('#agent-input').fill('Build this project and tell me what fails.')
    await page.locator('#agent-send').click()

    await expect
      .poll(async () => page.locator('#agent-output .rw-thread-message').count(), { timeout: 20_000 })
      .toBeGreaterThan(0)

    await expect(page.locator('.rw-agent-launch-empty')).toBeHidden()
    await expect(page.locator('#agent-starter-prompts .rw-prompt-chip')).toHaveCount(0)
  })
})

test('agent empty state hides recovery when no valid project workspace is selected', async () => {
  const suffix = `empty-recovery-${Date.now()}-${Math.random().toString(16).slice(2)}`
  seedInterruptedRun(suffix)

  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await waitForFirstWindow(app)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)
    await agentTopbarTab(page).click()

    const recovery = page.locator('#agent-recovery')
    await expect(recovery).toBeEmpty({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /Recovered work/i })).toHaveCount(0)
    await expect(page.locator('.rw-agent-launch-empty')).toBeVisible()
    await expect(page.locator('.rw-agent-composer')).toBeVisible()
  } finally {
    await app.close()
  }
})

test('agent first-run flow suppresses project actions after weak workspace selection', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rina:workspace-selected', { detail: { path: '/home/karina/Downloads' } }))
    })

    await expect(page.locator('#agent-starter-prompts .rw-prompt-chip')).toHaveCount(0)
    await expect(page.locator('#agent-input')).toHaveAttribute('placeholder', 'Choose a project folder to give Rina safe context.')
    await expect(page.getByRole('button', { name: 'Build project' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Run tests' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Inspect workspace' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Plan a fix' })).toHaveCount(0)
    await expect(page.locator('.rw-agent-launch-title')).toBeVisible()
  })
})
