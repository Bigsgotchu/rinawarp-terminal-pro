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

function createProjectWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-agent-first-run-'))
  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'rinawarp-agent-first-run-fixture',
        version: '1.0.0',
        private: true,
        scripts: {
          build: 'node build.mjs',
          test: 'node test.mjs',
        },
      },
      null,
      2
    ),
    'utf8'
  )
  fs.writeFileSync(path.join(workspaceRoot, 'build.mjs'), "console.log('build ok')\n", 'utf8')
  fs.writeFileSync(path.join(workspaceRoot, 'test.mjs'), "console.log('tests ok')\n", 'utf8')
  return workspaceRoot
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
    await expect(page.locator('[data-agent-section="workspace-setup"]')).toBeVisible()
    await expect(page.locator('[data-agent-section="workspace-setup"]')).toContainText('Choose a project folder and tell Rina what you want done.')
    await expect(page.locator('[data-agent-section="workspace-setup"]')).toContainText('After choosing a project')
    await expect(page.getByRole('button', { name: 'Choose project' })).toBeVisible()

    const examplePrompts = page.locator('#agent-starter-prompts [data-example-prompt]')
    await expect(examplePrompts).toHaveCount(4)
    await expect(page.locator('.rw-agent-composer [data-agent-prompt], #agent-output [data-agent-prompt]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Build this project and tell me what fails' }).click()
    await expect(page.locator('#agent-input')).toHaveValue('Build this project and tell me what fails')
    await expect(page.locator('#agent-output .rw-thread-message')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Browse Marketplace/i })).toBeVisible()

    await expect(page.locator('#status-bar')).toBeHidden()
    await expect(page.locator('#workspace-picker')).toBeHidden()
    await expect(page.locator('.rw-agent-welcome-card')).toHaveCount(0)
    await expect(page.locator('#panel-execution-trace .rw-execution-trace-empty')).toHaveCount(0)
    await expect(page.locator('#agent-output .rw-thread-message')).toHaveCount(0)
  })
})

test('agent first-run flow fills natural-language examples only after safe project scan', async () => {
  const workspaceRoot = createProjectWorkspace()
  await withApp(
    async ({ page }) => {
      await agentTopbarTab(page).click()

      await expect(page.locator('[data-agent-section="guided-fix"]')).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('[data-agent-section="guided-fix"]')).toContainText('Project ready')
      await expect(page.locator('[data-agent-section="guided-fix"]')).toContainText('Ask Rina what you want done.')
      await expect(page.locator('.rw-agent-composer [data-agent-prompt], #agent-output [data-agent-prompt]')).toHaveCount(0)
      await expect(page.locator('#agent-starter-prompts [data-example-prompt]')).toHaveCount(4)
      await page.getByRole('button', { name: 'Run tests and explain failures' }).click()
      await expect(page.locator('#agent-input')).toHaveValue('Run tests and explain failures')
      await expect(page.locator('#agent-input')).toHaveAttribute('placeholder', 'Ask Rina to fix, build, test, or explain...')
      await expect(page.locator('#agent-output .rw-thread-message')).toHaveCount(0)
    },
    {
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }
  )
})

test('agent launch scaffolding stays idle when an example only fills the composer', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await expect(page.locator('.rw-agent-launch-title')).toBeVisible()

    await page.getByRole('button', { name: 'Plan a fix safely' }).click()

    await expect(page.locator('#agent-input')).toHaveValue('Plan a fix safely. Do not edit files without approval.')
    await expect(page.locator('.rw-agent-launch-empty')).toBeVisible()
    await expect(page.locator('#agent-output .rw-thread-message')).toHaveCount(0)
    await expect(page.locator('#agent-starter-prompts [data-example-prompt]')).toHaveCount(4)
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

    await expect(page.locator('#agent-starter-prompts [data-example-prompt]')).toHaveCount(4)
    await expect(page.locator('#agent-input')).toHaveAttribute('placeholder', 'Choose a project folder to give Rina safe context.')
    await expect(page.locator('.rw-agent-composer [data-agent-prompt], #agent-output [data-agent-prompt]')).toHaveCount(0)
    await expect(page.locator('.rw-agent-launch-title')).toBeVisible()
  })
})
