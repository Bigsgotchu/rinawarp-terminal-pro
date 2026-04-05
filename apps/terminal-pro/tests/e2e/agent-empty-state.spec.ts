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

test('agent empty state shows Rina presence, trust hierarchy, and suggested actions', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const welcomeCard = page.locator('.rw-agent-welcome-card')

    await expect(welcomeCard).toContainText(
      /Fix your broken project automatically\.|This folder may not be the project root yet\.|Open a project and click Fix Project\./i,
      { timeout: 15_000 }
    )
    await expect(welcomeCard.getByRole('button', { name: 'Open Project' })).toBeVisible()
    await expect(welcomeCard.getByRole('button', { name: 'Try Demo Project' })).toBeVisible()
    await expect(page.locator('#workspace-picker')).toBeVisible()
    await expect(page.locator('#status-bar')).toContainText(/Workspace:/i)
    await expect(page.locator('#status-bar')).toContainText(/Rina workbench/i)
    await expect(page.locator('#status-bar')).toContainText(/Choose a project folder to give Rina stronger context/i)

    const starterPrompts = page.locator('#agent-starter-prompts')
    await expect(starterPrompts).toBeEmpty()
    await expect(page.locator('[data-agent-section="empty-state"]')).toBeVisible()
  })
})

test('agent welcome scaffolding collapses after the thread becomes active', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await expect(page.locator('.rw-agent-welcome-card')).toBeVisible()

    await page.locator('#agent-input').fill('Build this project and tell me what fails.')
    await page.locator('#agent-send').click()

    await expect
      .poll(async () => page.locator('#agent-output .rw-thread-message').count(), { timeout: 20_000 })
      .toBeGreaterThan(0)

    await expect(page.locator('.rw-agent-welcome-card')).toBeHidden()
    await expect(page.locator('[data-agent-section="suggested-actions"]')).toBeHidden()
  })
})

test('agent empty state surfaces recovery summary when interrupted work is restored', async () => {
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
    await expect(recovery).toContainText(/Resume your last fix/i, { timeout: 20_000 })
    await expect(recovery).toContainText(/Your project is safe and ready to continue/i, { timeout: 20_000 })
    await expect(recovery.getByRole('button', { name: /Resume fix/i })).toBeVisible()
    await expect(page.locator('.rw-agent-welcome-card')).toBeHidden()
    await expect(page.locator('.rw-agent-composer')).toBeHidden()
  } finally {
    await app.close()
  }
})

test('agent first-run flow treats Downloads as weak context and shows workspace guidance', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rina:workspace-selected', { detail: { path: '/home/karina/Downloads' } }))
    })

    await expect(page.locator('#workspace-picker')).toContainText(/Workspace: Downloads/i)
    const setup = page.locator('[data-agent-section="workspace-setup"]')
    await expect(setup).toContainText(/Downloads may not be the right project folder/i)
    await expect(setup.getByRole('button', { name: 'Open Project' })).toBeVisible()
    await expect(setup.getByRole('button', { name: 'Try Demo Project' })).toBeVisible()
    await expect(page.locator('#status-summary')).toContainText(/Choose a project folder to give Rina stronger context/i)
  })
})
