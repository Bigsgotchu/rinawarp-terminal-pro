import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { withApp } from './_app'
import { modKey } from './_helpers'
import { launchApp } from './_launch'

const starterIntents = ['Build this project', 'Run tests'] as const

async function openAgentTab(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]').click()
}

async function openDiagnosticsTab(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-shell-source="shell_activitybar"][data-shell-nav="diagnostics"][aria-label="Diagnostics"]').click()
}

async function openRunsInspector(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="runs"][aria-label="Runs Inspector"]').click()
}

async function sendPrompt(page: import('@playwright/test').Page, prompt: string): Promise<void> {
  await page.locator('#agent-input').fill(prompt)
  await page.locator('#agent-send').click()
}

async function ensureProjectContext(page: import('@playwright/test').Page): Promise<void> {
  const demoButton = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click()
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible({ timeout: 30_000 })
  }
}

function promptForIntent(intentLabel: (typeof starterIntents)[number]): string {
  if (intentLabel === 'Run tests') return 'Run the tests and summarize the failures.'
  return 'Build this project and tell me what fails.'
}

async function seedWorkbenchRunFixture(
  page: import('@playwright/test').Page,
  args: {
    run: {
      id: string
      sessionId: string
      title: string
      command: string
      cwd: string
      status: 'running' | 'ok' | 'failed' | 'interrupted'
      startedAt: string
      updatedAt: string
      endedAt: string | null
      exitCode?: number | null
      commandCount: number
      failedCount: number
      latestReceiptId?: string
      projectRoot?: string
      source?: string
      platform?: string
      originMessageId?: string
      restored?: boolean
    }
    outputTail?: string
    artifactSummary?: {
      stdoutChunks: number
      stderrChunks: number
      metaChunks: number
      stdoutPreview: string
      stderrPreview: string
      metaPreview: string
      changedFiles: string[]
      diffHints: string[]
    }
    message?: {
      id: string
      role: 'user' | 'rina' | 'system'
      workspaceKey?: string
      ts?: number
      runIds?: string[]
      content?: Array<Record<string, unknown>>
    }
  }
): Promise<string> {
  return await page.evaluate(({ run, outputTail, artifactSummary, message }) => {
    const bridge = (window as any).__rinaE2EWorkbench
    if (!bridge) throw new Error('E2E workbench bridge unavailable')
    const state = bridge.getState()
    const workspaceKey = state.workspaceKey
    bridge.dispatch({ type: 'runs/upsert', run })
    if (typeof outputTail === 'string') {
      bridge.dispatch({ type: 'runs/setOutputTail', runId: run.id, tail: outputTail })
    }
    if (artifactSummary) {
      bridge.dispatch({ type: 'runs/setArtifactSummary', runId: run.id, summary: artifactSummary })
    }
    if (message) {
      bridge.dispatch({
        type: 'chat/add',
        msg: {
          id: message.id,
          role: message.role,
          content: message.content,
          ts: message.ts || Date.now(),
          workspaceKey: message.workspaceKey || workspaceKey,
          runIds: message.runIds || [run.id],
        },
      })
    }
    return workspaceKey
  }, args)
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

for (const intentLabel of starterIntents) {
  test(`Rina "${intentLabel}" chip creates receipts-backed run block and expands output`, async () => {
    await withApp(async ({ page }) => {
      await openAgentTab(page)
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
        await sendPrompt(page, promptForIntent(intentLabel))
      }

      await expect
        .poll(
          async () => {
            return await thread.locator('.rw-thread-message').count()
          },
          { timeout: 20_000 }
        )
        .toBeGreaterThan(beforeMessageCount)

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
      await expect(runBlock).toBeVisible({ timeout: 30_000 })
      await expect(runBlock).toContainText(/receipt|proof pending|receipt ready|session saved/i)

      await runBlock.locator('[data-run-toggle-output]').last().click()

      const tail = runBlock.locator('.rw-inline-runblock-tail')
      await expect(tail).toBeVisible({ timeout: 20_000 })

      await expect
        .poll(
          async () => {
            return ((await tail.textContent()) || '').trim().length
          },
          { timeout: 20_000 }
        )
        .toBeGreaterThan(0)
    })
  })
}

test('Diagnostics inspector copies the current-workspace trust snapshot', async () => {
  await withApp(async ({ app, page }) => {
    await openDiagnosticsTab(page)
    const diagnosticsOutput = page.locator('#diagnostics-output')
    await expect(diagnosticsOutput).toContainText('Mode:')
    await expect(diagnosticsOutput.locator('[data-copy-trust-snapshot]')).toBeVisible()

    await app.evaluate(({ clipboard }) => clipboard.clear())
    await diagnosticsOutput.locator('[data-copy-trust-snapshot]').evaluate((node) => {
      ;(node as HTMLButtonElement).click()
    })

    await expect
      .poll(
        async () => app.evaluate(({ clipboard }) => clipboard.readText()),
        { timeout: 10_000 }
      )
      .toContain('Trust scope: current workspace')

    const snapshotText = await app.evaluate(({ clipboard }) => clipboard.readText())

    expect(snapshotText).toContain('Workspace:')
    expect(snapshotText).toContain('Trust scope: current workspace')
    expect(snapshotText).toContain('IPC:')
    expect(snapshotText).toContain('Renderer:')
  })
})

test('Inline run block copy writes the run command and shows status feedback', async () => {
  await withApp(async ({ app, page }) => {
    await openAgentTab(page)
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
    if (await buildButton.isVisible().catch(() => false)) {
      await buildButton.click()
    } else {
      await sendPrompt(page, promptForIntent('Build this project'))
    }

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
    await expect(runBlock).toBeVisible({ timeout: 30_000 })

    const commandText = ((await runBlock.locator('.rw-inline-runblock-command code').textContent()) || '').trim()
    expect(commandText.length).toBeGreaterThan(0)

    await app.evaluate(({ clipboard }) => clipboard.clear())
    await runBlock.locator('[data-run-copy]').evaluate((button) => (button as HTMLButtonElement).click())

    await expect(page.locator('#status-summary')).toContainText('Run command copied')
    await expect
      .poll(
        async () => app.evaluate(({ clipboard }) => clipboard.readText()),
        { timeout: 10_000 }
      )
      .toContain(commandText)
  })
})

test('Runs inspector renders compact rows with proof-aware success state', async () => {
  await withApp(async ({ page }) => {
    await openAgentTab(page)
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
    if (await buildButton.isVisible().catch(() => false)) {
      await buildButton.click()
    } else {
      await sendPrompt(page, promptForIntent('Build this project'))
    }

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

    await openRunsInspector(page)

    const runRow = page.locator(`.rw-run-block[data-run-id="${runId}"]`)
    await expect(runRow).toBeVisible({ timeout: 20_000 })
    await expect(runRow.locator('.rw-run-row')).toBeVisible()
    await expect(runRow.locator('.rw-run-section')).toHaveCount(4)

    const runStyles = await runRow.evaluate((node) => {
      const styles = getComputedStyle(node)
      return {
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow,
      }
    })

    expect(runStyles.borderRadius).toBe('18px')
    expect(runStyles.boxShadow).not.toBe('none')

    const statusText = ((await runRow.locator('.rw-status-pill').textContent()) || '').trim()
    if (statusText.includes('SUCCESS')) {
      const metaText = ((await runRow.locator('.rw-run-meta').textContent()) || '').trim()
      expect(runId.length).toBeGreaterThan(0)
      expect(metaText).toContain('Exit 0')
    }
  })
})

test('Failed run summary is evidence-backed and actions use the intended hierarchy', async () => {
  await withApp(async ({ page }) => {
    const now = new Date().toISOString()
    await seedWorkbenchRunFixture(page, {
      run: {
        id: 'e2e_failed_build_run',
        sessionId: 'e2e_failed_build_session',
        title: 'npm run build',
        command: 'npm run build',
        cwd: '/tmp/e2e-project',
        status: 'failed',
        startedAt: now,
        updatedAt: now,
        endedAt: now,
        exitCode: 1,
        commandCount: 1,
        failedCount: 1,
        latestReceiptId: 'receipt_failed_build',
        projectRoot: '/tmp/e2e-project',
        restored: false,
      },
      outputTail:
        "src/components/Button.tsx:42:13 - error TS2339: Property 'variant' does not exist on type 'ButtonProps'\nBuild failed with TypeScript errors.",
      artifactSummary: {
        stdoutChunks: 1,
        stderrChunks: 1,
        metaChunks: 1,
        stdoutPreview: 'npm run build',
        stderrPreview: "TS2339: Property 'variant' does not exist on type 'ButtonProps'",
        metaPreview: 'build failed after touching ui and button props',
        changedFiles: ['src/components/Button.tsx', 'src/components/Button.test.tsx'],
        diffHints: ['renamed prop from tone to variant'],
      },
      message: {
        id: 'rina:e2e:failed-build',
        role: 'rina',
        content: [{ type: 'bubble', text: 'The build failed, and I kept the proof attached.' }],
      },
    })

    await openAgentTab(page)

    const runBlock = page.locator('.rw-inline-runblock[data-run-id="e2e_failed_build_run"]')
    await expect(runBlock).toBeVisible()
    await expect(runBlock.locator('.rw-inline-runblock-banner')).toContainText('Confidence: High')
    await expect(runBlock.locator('.rw-inline-runblock-banner')).toContainText('What changed: Recent changes touched src/components/Button.tsx, src/components/Button.test.tsx.')
    await expect(runBlock.locator('.rw-inline-runblock-banner')).toContainText('Best next action: Fix type errors.')
    await expect(runBlock.locator('.rw-inline-runblock-banner')).toContainText('Failure clues:')

    const bottomActions = runBlock.locator('.rw-inline-runblock-actions-bottom')
    await expect(bottomActions.locator('[data-run-rerun="e2e_failed_build_run"]')).toHaveClass(/is-primary/)
    await expect(bottomActions.locator('[data-run-fix="e2e_failed_build_run"]')).toHaveClass(/is-attention/)
    await expect(bottomActions.locator('[data-run-toggle-output="e2e_failed_build_run"]')).toHaveClass(/is-secondary/)
    await expect(bottomActions.locator('[data-run-copy="e2e_failed_build_run"]')).toHaveClass(/is-subtle/)
  })
})

test('Interrupted restored test run shows smarter recovery copy and primary recovery action', async () => {
  await withApp(async ({ page }) => {
    const now = new Date().toISOString()
    const workspaceKey = await seedWorkbenchRunFixture(page, {
      run: {
        id: 'e2e_interrupted_test_run',
        sessionId: 'e2e_interrupted_test_session',
        title: 'npm test',
        command: 'npm test',
        cwd: '/tmp/e2e-project',
        status: 'interrupted',
        startedAt: now,
        updatedAt: now,
        endedAt: null,
        exitCode: 130,
        commandCount: 1,
        failedCount: 0,
        latestReceiptId: 'receipt_interrupted_test',
        projectRoot: '/tmp/e2e-project',
        restored: true,
      },
      message: {
        id: 'system:runs:restore:e2e',
        role: 'rina',
        workspaceKey: undefined,
        content: [
          {
            type: 'reply-card',
            kind: 'recovery',
            label: 'I recovered your last session safely',
          },
        ],
      },
    })

    await page.evaluate((nextWorkspaceKey) => {
      const bridge = (window as any).__rinaE2EWorkbench
      bridge.dispatch({ type: 'workspace/set', workspaceKey: nextWorkspaceKey })
    }, workspaceKey)

    await openAgentTab(page)

    const recoveryStrip = page.locator('.rw-recovery-strip')
    await expect(recoveryStrip).toBeVisible()
    await expect(recoveryStrip).toContainText('Receipts are intact.')
    await expect(recoveryStrip).toContainText('Resume tests')
    await expect(recoveryStrip).toContainText('Retry tests with same env')
    await expect(recoveryStrip).toContainText('Best next move: Retry tests with same env.')

    await expect(recoveryStrip.locator('[data-run-rerun="e2e_interrupted_test_run"]')).toHaveClass(/is-secondary/)
    await expect(recoveryStrip.locator('[data-run-resume="e2e_interrupted_test_run"]')).toHaveClass(/is-primary/)
    await expect(recoveryStrip.locator('[data-run-reveal="receipt_interrupted_test"]')).toHaveClass(/is-secondary/)
  })
})

test('Density toggle switches between compact and comfortable at runtime', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.keyboard.press(modKey(','))
    const compact = page.locator('[data-density-option="compact"]')
    const comfortable = page.locator('[data-density-option="comfortable"]')
    await expect(compact).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')

    await comfortable.click()
    await expect(comfortable).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')

    await compact.click()
    await expect(compact).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  })
})

test('Density choice persists across relaunch', async () => {
  const suffix = `density-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.keyboard.press(modKey(','))
    const comfortable = page.locator('[data-density-option="comfortable"]')
    await comfortable.click()
    await expect(comfortable).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  } finally {
    await app.close()
  }

  const app2 = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await app2.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')
  } finally {
    await app2.close()
  }
})

test('Capability ready path starts a receipts-backed run from the Agent thread', async () => {
  await withApp(async ({ page }) => {
    await openAgentTab(page)
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    await sendPrompt(page, 'Diagnose my computer safely.')

    await expect(thread).toContainText(/Capability ready/i)
    await thread.getByRole('button', { name: 'Run diagnostics' }).click()

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

    await expect(thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)).toBeVisible()
  })
})

test('Capability locked path opens the Pro upgrade flow', async () => {
  await withApp(async ({ page }) => {
    await openAgentTab(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    await sendPrompt(page, 'Deploy this to Cloudflare safely.')

    await expect(thread).toContainText(/Capability locked/i)
    await thread.getByRole('button', { name: 'Upgrade to Pro' }).evaluate((button) => (button as HTMLButtonElement).click())
    await expect(page.getByRole('dialog', { name: 'Upgrade to Pro' })).toBeVisible()
  })
})

test('Pro entitlement unlocks Cloudflare capability and allows a trusted run from the Agent thread', async () => {
  const suffix = `pro-capability-${Date.now()}-${Math.random().toString(16).slice(2)}`
  seedEntitlement(suffix, { tier: 'pro' })

  await withApp(async ({ page }) => {
    await openAgentTab(page)
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    await sendPrompt(page, 'Deploy this to Cloudflare safely.')

    await expect(thread).toContainText(/Capability ready/i)
    await expect(thread).not.toContainText(/Capability locked/i)
    await thread
      .locator('[data-capability-run="deploy:cloudflare"]')
      .evaluate((button) => (button as HTMLButtonElement).click())

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

    await expect(thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)).toBeVisible()
  }, {
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })
})

test('Capability install-needed path offers install and becomes ready after install', async () => {
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-capability-home-'))
  const app = await launchApp({
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: `capability-${Date.now()}`,
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await openAgentTab(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    await sendPrompt(page, 'Run system diagnostics.')

    await expect(thread).toContainText(/Capability required/i)
    await expect(thread).toContainText(/Install needed/i)
    await thread
      .getByRole('button', { name: 'Install capability' })
      .evaluate((button) => (button as HTMLButtonElement).click())

    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const result = await window.rina.capabilityPacks()
            const pack = result?.capabilities?.find((entry) => entry.key === 'system-diagnostics')
            return pack?.installState || ''
          }),
        { timeout: 20_000 }
      )
      .toBe('installed')

    await sendPrompt(page, 'Run system diagnostics.')
    await expect(thread).toContainText(/Capability ready/i)
  } finally {
    await app.close()
    fs.rmSync(isolatedHome, { recursive: true, force: true })
  }
})

test('Clean launch shows the Agent thread composer and starter prompts without the old truth strip lane', async () => {
  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: `onboarding-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await openAgentTab(page)

    await expect(page.locator('#agent-context')).toHaveCount(0)
    await expect(page.locator('[data-agent-section="empty-state"]')).toBeVisible()
    await expect(page.locator('#agent-input')).toBeVisible()
    await expect(page.locator('.rw-agent-suggestions button')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open Project' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try Demo Project' }).first()).toBeVisible()
  } finally {
    await app.close()
  }
})
