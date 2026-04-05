import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { launchApp } from './_launch'
import { waitForAppReady, waitForFirstWindow, withApp } from './_app'

type IntentCase = {
  label: 'Build this project' | 'Run tests' | 'Deploy'
  env?: Record<string, string>
  beforeLaunch?: () => void
}

function seedEntitlement(userDataSuffix: string, args: { tier: 'pro' | 'creator' | 'team'; customerId?: string }): void {
  const userDataDir = path.join(os.tmpdir(), `rinawarp-e2e-${userDataSuffix}`)
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(
    path.join(userDataDir, 'license-entitlement.json'),
    JSON.stringify(
      {
        tier: args.tier,
        token: 'e2e-local-entitlement',
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        customerId: args.customerId || 'cus_e2e_local',
        verifiedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        status: 'active',
      },
      null,
      2
    ),
    'utf8'
  )
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

async function waitForNewRunBlock(page: Page, beforeRunIds: Set<string>): Promise<{ runId: string; runBlock: ReturnType<Page['locator']> }> {
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

async function ensureProjectContext(page: Page): Promise<void> {
  const demoButton = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click()
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible({ timeout: 30_000 })
  }
}

function promptForIntent(intentLabel: string): string {
  if (intentLabel === 'Run tests') return 'Run the tests and summarize the failures.'
  if (intentLabel === 'Deploy') return 'Deploy this project safely.'
  return 'Build this project and tell me what fails.'
}

async function assertProofBackedIntentRun(page: Page, intentLabel: string): Promise<void> {
  await page.getByRole('button', { name: 'Rina workbench' }).click()
  await ensureProjectContext(page)
  const thread = page.locator('#agent-output')
  await expect(page.locator('#agent-input')).toBeVisible()

  const beforeMessageCount = await thread.locator('.rw-thread-message').count()
  const beforeRunIds = new Set(
    await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
  )

  const intentButton = page.getByRole('button', { name: intentLabel }).first()
  if (await intentButton.isVisible().catch(() => false)) {
    await intentButton.click()
  } else {
    await page.locator('#agent-input').fill(promptForIntent(intentLabel))
    await page.locator('#agent-send').click()
  }

  await expect
    .poll(async () => thread.locator('.rw-thread-message').count(), { timeout: 20_000 })
    .toBeGreaterThan(beforeMessageCount)

  const { runId, runBlock } = await waitForNewRunBlock(page, beforeRunIds)

  await expect(runBlock.locator('.rw-inline-runblock-command code')).not.toHaveText('')
  await expect(runBlock.locator('.rw-inline-runblock-meta')).toContainText(/cwd|receipt|exit/i)
  await expect(runBlock).toContainText(/proof pending|receipt|session saved|receipt ready/i)

  await runBlock.locator('[data-run-toggle-output]').first().click()
  const tail = runBlock.locator('.rw-inline-runblock-tail')
  await expect(tail).toBeVisible({ timeout: 20_000 })
  await expect
    .poll(async () => (((await tail.textContent()) || '').trim().length), { timeout: 20_000 })
    .toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Runs Inspector' }).click()
  const runRow = page.locator(`.rw-run-block[data-run-id="${runId}"]`)
  await expect(runRow).toBeVisible({ timeout: 20_000 })
  await expect(runRow).toContainText(/Receipt|Exit|Command/i)
}

const killerIntentCases: IntentCase[] = [
  { label: 'Build this project' },
  { label: 'Run tests' },
]

for (const intentCase of killerIntentCases) {
  test(`killer intent: ${intentCase.label} stays in the thread with proof and inspector parity`, async () => {
    if (intentCase.beforeLaunch) intentCase.beforeLaunch()
    await withApp(async ({ page }) => {
      await assertProofBackedIntentRun(page, intentCase.label)
    }, intentCase.env)
  })
}

test('killer intent recovery: restored interrupted run offers resume and inspector proof context', async () => {
  const suffix = `restore-${Date.now()}-${Math.random().toString(16).slice(2)}`
  seedInterruptedRun(suffix)

  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await waitForFirstWindow(app)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)
    await page.getByRole('button', { name: 'Rina workbench' }).click()

    const thread = page.locator('#agent-output')
    const recovery = page.locator('#agent-recovery')
    await expect
      .poll(
        async () => {
          const result = await page.evaluate(async () => {
            return await window.rina.runsList(10)
          })
          return Array.isArray(result?.runs) ? result.runs.length : 0
        },
        { timeout: 20_000 }
      )
      .toBeGreaterThan(0)

    await expect(recovery).toContainText(/I recovered your last session safely/i, { timeout: 20_000 })
    await expect(recovery).toContainText(/Recovered task\s+Test: npm test/i, { timeout: 20_000 })
    const runs = await page.evaluate(async () => await window.rina.runsList(10))
    expect(Array.isArray(runs?.runs)).toBe(true)
    expect(runs.runs.some((run: { interrupted?: boolean; latestCommand?: string }) => run.interrupted && /npm test/i.test(String(run.latestCommand || '')))).toBe(true)
  } finally {
    await app.close()
  }
})

test('killer intent deploy capability path stays proof-backed when Pro is unlocked', async () => {
  const suffix = `pro-deploy-${Date.now()}-${Math.random().toString(16).slice(2)}`
  seedEntitlement(suffix, { tier: 'pro' })

  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await waitForFirstWindow(app)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)
    await page.getByRole('button', { name: 'Rina workbench' }).click()
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    await page.locator('#agent-input').fill('Deploy this to Cloudflare safely.')
    await page.locator('#agent-send').click()

    await expect(thread).toContainText(/Capability ready/i)
    await thread.locator('[data-capability-run="deploy:cloudflare"]').evaluate((button) => {
      ;(button as HTMLButtonElement).click()
    })

    const { runBlock } = await waitForNewRunBlock(page, beforeRunIds)
    await expect(runBlock).toContainText(/proof pending|receipt|session saved|receipt ready/i)
  } finally {
    await app.close()
  }
})
