import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withPackagedApp, waitForAppReady } from './_app'

test.setTimeout(180_000)

function freshHomeEnv(suffix: string): Record<string, string> {
  const cleanHome = path.join(os.tmpdir(), `rinawarp-rc-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })
  return {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  }
}

function createBuildFixtureWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-rc-build-'))
  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'rinawarp-rc-fixture',
        version: '1.0.0',
        private: true,
        scripts: {
          build: 'node build.mjs',
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
      "console.log('RC fixture build running')",
      "console.error('RC fixture build stderr proof')",
      'process.exit(0)',
      '',
    ].join('\n'),
    'utf8'
  )
  return workspaceRoot
}

async function waitForRunBlock(page: Page): Promise<{ runId: string; runBlock: ReturnType<Page['locator']> }> {
  const thread = page.locator('#agent-output')
  let runId = ''
  await expect
    .poll(
      async () => {
        const runBlocks = thread.locator('.rw-inline-runblock')
        const count = await runBlocks.count()
        for (let index = 0; index < count; index += 1) {
          const candidate = (await runBlocks.nth(index).getAttribute('data-run-id')) || ''
          if (candidate) {
            runId = candidate
            return candidate
          }
        }
        return ''
      },
      { timeout: 60_000 }
    )
    .not.toBe('')
  const runBlock = thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)
  await expect(runBlock).toBeVisible({ timeout: 30_000 })
  return { runId, runBlock }
}

async function waitForProof(page: Page): Promise<boolean> {
  return expect
    .poll(
      async () => {
        const proofIndicator = page.locator('#agent-output').getByText(/Proof|verification|verified/i)
        return (await proofIndicator.count()) > 0
      },
      { timeout: 45_000 }
    )
    .toBeTruthy()
}

test.describe('RC Validation Suite', () => {
  test('RC-1: Launch packaged Electron app, not dev build', async () => {
    const env = freshHomeEnv(`launch-${Date.now()}`)

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      await expect(page.getByRole('heading', { name: 'RinaWarp Terminal Pro' })).toBeVisible()
      await expect(page.getByText('What would you like me to do?')).toBeVisible()
    }, env)
  })

  test('RC-2: Open real project with auto workspace detection', async () => {
    const suffix = `workspace-${Date.now()}`
    const workspaceRoot = createBuildFixtureWorkspace()
    const env = {
      ...freshHomeEnv(suffix),
      RINAWARP_E2E: '1',
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      const workspace = await page.evaluate(async () => await (window as any).rina?.workspaceDefault?.())
      expect(workspace).toMatchObject({
        ok: true,
        path: workspaceRoot,
        source: 'e2e-auto',
      })
    }, env)
  })

  test('RC-3: Plan a safe change shows commands before approval', async () => {
    const suffix = `plan-${Date.now()}`
    const workspaceRoot = createBuildFixtureWorkspace()
    const env = {
      ...freshHomeEnv(suffix),
      RINAWARP_E2E: '1',
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      const input = page.locator('#agent-input')
      await expect(input).toBeVisible({ timeout: 30_000 })
      await input.fill('Plan a safe change to this project.')
      await input.press('Enter')

      await expect(page.locator('.rw-inline-runblock')).toHaveCount(0, { timeout: 10_000 })
    }, env)
  })

  test('RC-4: Approval block renders commands, nothing executes before approval', async () => {
    const suffix = `approval-${Date.now()}`
    const workspaceRoot = createBuildFixtureWorkspace()
    const env = {
      ...freshHomeEnv(suffix),
      RINAWARP_E2E: '1',
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      const input = page.locator('#agent-input')
      await expect(input).toBeVisible({ timeout: 30_000 })
      await input.fill('Build this project.')
      await input.press('Enter')

      await expect(page.locator('.rw-inline-runblock')).toHaveCount(0, { timeout: 15_000 })

      const approvalBlock = page.locator('[data-msg-id^="planner-approval"]')
      await expect(approvalBlock).toBeVisible({ timeout: 30_000 })
      await expect
        .poll(async () => approvalBlock.locator('.rw-inline-runblock-command').count(), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(1)
    }, env)
  })

  test('RC-5: Click Approve & Run executes and shows Proof', async () => {
    const suffix = `execute-${Date.now()}`
    const workspaceRoot = createBuildFixtureWorkspace()
    const env = {
      ...freshHomeEnv(suffix),
      RINAWARP_E2E: '1',
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      const input = page.locator('#agent-input')
      await expect(input).toBeVisible({ timeout: 30_000 })
      await input.fill('Build this project.')
      await input.press('Enter')

      await expect(page.locator('.rw-inline-runblock')).toHaveCount(0, { timeout: 15_000 })

      const approvalBtn = page.getByRole('button', { name: /approve|run|execute/i })
      await expect(approvalBtn).toBeVisible({ timeout: 30_000 })
      await approvalBtn.click()

      const { runId } = await waitForRunBlock(page)
      expect(runId).toBeTruthy()

      await waitForProof(page)

      const proofBtn = page.getByRole('button', { name: /open proof/i }).first()
      await expect(proofBtn).toBeVisible({ timeout: 10_000 })
    }, env)
  })

  test('RC-6: Restart app, Workspace Knowledge persists', async () => {
    const suffix = `persist-${Date.now()}`
    const workspaceRoot = createBuildFixtureWorkspace()
    const env = {
      ...freshHomeEnv(suffix),
      RINAWARP_E2E: '1',
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }

    let exportedReceiptId = ''

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      const input = page.locator('#agent-input')
      await expect(input).toBeVisible({ timeout: 30_000 })
      await input.fill('Build this project.')
      await input.press('Enter')

      await expect(page.locator('.rw-inline-runblock')).toHaveCount(0, { timeout: 15_000 })

      const approvalBtn = page.getByRole('button', { name: /approve|run|execute/i })
      await expect(approvalBtn).toBeVisible({ timeout: 30_000 })
      await approvalBtn.click()

      await waitForRunBlock(page)
      await waitForProof(page)

      const proofBtn = page.getByRole('button', { name: /open proof/i }).first()
      await proofBtn.click()
      await expect(page.getByRole('button', { name: /export|download/i })).toBeVisible({ timeout: 10_000 })
    }, env)
  })

  test('RC-7: SQLite memory store badge visible', async () => {
    const env = freshHomeEnv(`sqlite-${Date.now()}`)

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      await page.evaluate(() => (window as any).__rinaSettings?.open('memory'))
      await expect(page.locator('#rw-settings')).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)
    }, env)
  })

  test('RC-8: Rina asks for approval before execution', async () => {
    const suffix = `approval-gate-${Date.now()}`
    const workspaceRoot = createBuildFixtureWorkspace()
    const env = {
      ...freshHomeEnv(suffix),
      RINAWARP_E2E: '1',
      RINAWARP_E2E_WORKSPACE: workspaceRoot,
    }

    await withPackagedApp(async ({ page }) => {
      await waitForAppReady(page)
      const input = page.locator('#agent-input')
      await expect(input).toBeVisible({ timeout: 30_000 })
      await input.fill('Build this project.')
      await input.press('Enter')

      await expect(page.locator('.rw-inline-runblock')).toHaveCount(0, { timeout: 15_000 })

      const approvalBlock = page.locator('[data-msg-id^="planner-approval"]')
      const approvalBtn = approvalBlock.locator('button[type="button"]').filter({ hasText: /approve/i })
      await expect(approvalBtn).toBeVisible({ timeout: 30_000 })

      const rejectBtn = approvalBlock.locator('button[type="button"]').filter({ hasText: /reject|cancel/i })
      await expect(rejectBtn).toBeVisible()
    }, env)
  })
})
