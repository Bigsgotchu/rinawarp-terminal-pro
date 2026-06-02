import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withPackagedApp } from './_app'

test.setTimeout(120_000)

function freshHomeEnv(suffix: string): Record<string, string> {
  const cleanHome = path.join(os.tmpdir(), `rinawarp-packaged-home-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })
  return {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  }
}

function createBuildFixtureWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-packaged-build-'))
  fs.writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'rinawarp-packaged-build-fixture',
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
      "console.log('packaged build fixture running')",
      "console.error('packaged build fixture stderr proof')",
      'process.exit(0)',
      '',
    ].join('\n'),
    'utf8'
  )
  return workspaceRoot
}

async function submitBuildPrompt(page: Page): Promise<void> {
  const input = page.locator('#agent-input')
  await expect(input).toBeVisible({ timeout: 30_000 })
  await input.fill('Build this project and tell me what fails.')
  await page.locator('#agent-send').click()
}

async function waitForNewRunBlock(page: Page): Promise<{ runId: string; runBlock: ReturnType<Page['locator']> }> {
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
      { timeout: 45_000 }
    )
    .not.toBe('')
  const runBlock = thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)
  await expect(runBlock).toBeVisible({ timeout: 20_000 })
  return { runId, runBlock }
}

async function interceptReceiptDownload(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as any).__rinaReceiptExportText = ''
    ;(window as any).__rinaReceiptExportDownload = ''
    URL.createObjectURL = (blob: Blob) => {
      void blob.text().then((text) => {
        ;(window as any).__rinaReceiptExportText = text
      })
      return 'blob:rina-packaged-receipt-export'
    }
    HTMLAnchorElement.prototype.click = function () {
      ;(window as any).__rinaReceiptExportDownload = this.download
    }
  })
}

test('packaged first-run journey: customer can find workspace, settings, and a sane reply path', async () => {
  const env = freshHomeEnv(`first-run-${Date.now()}`)

  await withPackagedApp(async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'RinaWarp Terminal Pro' })).toBeVisible()
    await expect(page.getByText('What would you like me to do?')).toBeVisible()
    await expect(page.getByPlaceholder('Ask Rina to fix, build, test, or explain...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Build project' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run tests' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan a fix' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fix Project' })).toHaveCount(0)
    const recoverySection = page.locator('[data-agent-section="recovery"]')
    if (await recoverySection.isVisible().catch(() => false)) {
      await expect(recoverySection).toContainText(/I recovered your last session/i)
      await expect(recoverySection).toContainText(/everything looks safe to continue/i)
      await expect(page.getByRole('button', { name: 'Resume Fix' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'View Details' })).toBeVisible()
    }

    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('general'))
    await expect(page.locator('#rw-settings')).toBeVisible()
    await page.locator('#rw-settings [data-settings-tab="general"]').click()
    await expect(page.locator('#rw-settings')).toContainText(/workspace|project|open/i)
    await page.locator('#rw-settings [data-settings-tab="memory"]').click()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)
    await page.evaluate(() => window.__rinaSettings?.close())
    await expect(page.locator('#rw-settings')).toBeHidden()
  }, env)
})

test('packaged app persists memory profile across restart', async () => {
  const env = freshHomeEnv(`restart-persistence-${Date.now()}`)
  const preferredName = `Karina ${Date.now()}`

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('memory'))
    await expect(page.locator('#rw-settings')).toBeVisible()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)

    await page.locator('#rw-memory-preferred-name').fill(preferredName)
    await page.locator('#rw-memory-save-profile').click()
    await expect(page.locator('#rw-memory-feedback')).toContainText(/profile memory saved/i)
  }, env)

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('memory'))
    await expect(page.locator('#rw-settings')).toBeVisible()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)
    await expect(page.locator('#rw-memory-preferred-name')).toHaveValue(preferredName)
  }, env)
})

test('packaged app runs build and persists proof after restart', async () => {
  const suffix = `core-loop-${Date.now()}`
  const workspaceRoot = createBuildFixtureWorkspace()
  const env = {
    ...freshHomeEnv(suffix),
    RINAWARP_E2E: '1',
    RINAWARP_E2E_WORKSPACE: workspaceRoot,
  }
  let exportedReceiptId = ''
  let exportedRunId = ''

  await withPackagedApp(async ({ page }) => {
    const workspace = await page.evaluate(async () => await window.rina.workspaceDefault?.())
    expect(workspace).toMatchObject({ ok: true, path: workspaceRoot, source: 'e2e-auto' })

    await submitBuildPrompt(page)
    const { runId, runBlock } = await waitForNewRunBlock(page)
    exportedRunId = runId

    await expect(runBlock.locator('.rw-inline-runblock-command code')).toContainText(/npm run build|pnpm run build|npm build|pnpm build|build/i, { timeout: 30_000 })
    await expect(runBlock).toContainText(/exit|receipt|proof|verification/i, { timeout: 30_000 })

    await runBlock.getByRole('button', { name: /Open proof|View proof|View receipt/i }).click()
    await expect(page.getByRole('button', { name: /Export proof JSON|Export JSON/i })).toBeVisible({ timeout: 20_000 })
    await interceptReceiptDownload(page)
    await page.getByRole('button', { name: /Export proof JSON|Export JSON/i }).click()
    await expect.poll(async () => page.evaluate(() => String((window as any).__rinaReceiptExportText || '')), { timeout: 10_000 }).not.toBe('')
    const exported = await page.evaluate(() => JSON.parse(String((window as any).__rinaReceiptExportText || '{}')))

    expect(exported).toEqual(
      expect.objectContaining({
        receiptId: expect.any(String),
        command: expect.any(String),
        exitCode: expect.any(Number),
        verification: expect.anything(),
        proofBlockIds: expect.arrayContaining([expect.any(String)]),
      })
    )
    expect(exported.command).toMatch(/build/i)
    exportedReceiptId = exported.receiptId
  }, env)

  await withPackagedApp(async ({ page }) => {
    const runs = await page.evaluate(async () => await window.rina.runsList?.(20))
    expect(runs?.ok).toBe(true)
    await expect(page.locator('#agent-output')).toContainText(/Execution proof|Proof/i, { timeout: 30_000 })
    await expect(page.locator('#agent-output')).toContainText(exportedReceiptId || exportedRunId, { timeout: 30_000 })

    await page.getByRole('button', { name: /Run history|History/i }).first().click()
    await expect(page.locator('#runs-output')).toContainText(/build|proof|session/i, { timeout: 30_000 })
  }, env)
})

test('packaged app does not auto-select e2e workspace without e2e env', async () => {
  const suffix = `no-auto-select-${Date.now()}`
  const workspaceRoot = createBuildFixtureWorkspace()
  const env = {
    ...freshHomeEnv(suffix),
    RINAWARP_E2E: '0',
    RINAWARP_E2E_WORKSPACE: workspaceRoot,
  }

  await withPackagedApp(async ({ page }) => {
    const workspace = await page.evaluate(async () => await window.rina.workspaceDefault?.())
    expect(workspace?.path || '').not.toBe(workspaceRoot)
    expect(workspace?.source || '').not.toBe('e2e-auto')
  }, env)
})
