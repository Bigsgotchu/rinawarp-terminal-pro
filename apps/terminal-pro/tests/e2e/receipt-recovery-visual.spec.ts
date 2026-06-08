import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { withApp } from './_app'

const VISUAL_DIR = path.resolve(process.cwd(), 'test-results', 'receipt-recovery-visual')

type SeededRunArgs = {
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

async function seedWorkbenchRunFixture(page: Page, args: SeededRunArgs): Promise<string> {
  return await page.evaluate(({ run, outputTail, artifactSummary, message }) => {
    const bridge = (window as unknown as { __rinaE2EWorkbench?: { getState: () => { workspaceKey: string }; dispatch: (action: unknown) => void } })
      .__rinaE2EWorkbench
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

async function seedProjectWorkspaceContext(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const bridge = (window as unknown as {
      __rinaE2EWorkbench?: {
        dispatch: (action: unknown) => void
        getState: () => { workspaceKey: string }
      }
    }).__rinaE2EWorkbench
    if (!bridge) throw new Error('E2E workbench bridge unavailable')
    const currentWorkspace = bridge.getState().workspaceKey
    const workspaceKey = currentWorkspace && currentWorkspace !== '__none__' ? currentWorkspace : '/tmp/e2e-project'
    bridge.dispatch({ type: 'workspace/set', workspaceKey })
    bridge.dispatch({ type: 'code/setFiles', files: ['package.json', 'pnpm-lock.yaml', 'tsconfig.json'] })
    return workspaceKey
  })
}

async function seedStructuredReceipt(
  page: Page,
  args: SeededRunArgs & {
    receiptId: string
    seedRuntimeProof?: boolean
  }
): Promise<void> {
  await page.evaluate(({ run, artifactSummary, receiptId, seedRuntimeProof }) => {
    const bridge = (window as unknown as { __rinaE2EWorkbench?: { dispatch: (action: unknown) => void } }).__rinaE2EWorkbench
    if (!bridge) throw new Error('E2E workbench bridge unavailable')
    if (seedRuntimeProof) {
      const startedAt = Date.parse(run.startedAt) || Date.now()
      const completedAt = Date.parse(run.endedAt || run.updatedAt) || startedAt
      const verificationResults = [
        run.status === 'ok' ? 'Command exited successfully.' : `Command exited with code ${run.exitCode ?? 'unknown'}.`,
        artifactSummary?.stderrPreview || artifactSummary?.stdoutPreview || 'Receipt evidence captured.',
      ]
      bridge.dispatch({
        type: 'runBlocks/upsert',
        block: {
          id: `proof:${run.id}`,
          runId: run.id,
          title: run.title,
          summary: artifactSummary?.metaPreview || run.command,
          command: run.command,
          cwd: run.cwd,
          status: run.status === 'ok' ? 'success' : run.status === 'failed' ? 'failed' : run.status === 'interrupted' ? 'failed' : 'running',
          startedAt,
          completedAt,
          exitCode: run.exitCode,
          receipts: [{ id: receiptId, label: 'Runtime receipt' }],
          timeline: [],
        },
      })
      bridge.dispatch({
        type: 'executionReceipts/upsert',
        receipt: {
          id: run.id,
          sessionId: run.sessionId,
          workspaceId: run.projectRoot || run.cwd,
          userIntent: run.title,
          planId: run.id,
          startedAt,
          completedAt,
          status: run.status === 'ok' ? 'succeeded' : run.status === 'interrupted' ? 'cancelled' : 'failed',
          commands: [
            {
              id: `${run.id}:command`,
              command: run.command,
              cwd: run.cwd,
              startedAt: run.startedAt,
              completedAt: run.endedAt || run.updatedAt,
              exitCode: run.exitCode ?? (run.status === 'ok' ? 0 : 1),
              stdout: artifactSummary?.stdoutPreview || '',
              stderr: artifactSummary?.stderrPreview || '',
            },
          ],
          fileChanges: (artifactSummary?.changedFiles || []).map((changedFile) => ({ path: changedFile, changeType: 'modified' })),
          mcpCalls: [],
          artifacts: [
            {
              type: 'log',
              label: 'Output preview',
              value: artifactSummary?.stderrPreview || artifactSummary?.stdoutPreview || 'Receipt evidence captured.',
            },
          ],
          verification: {
            status: run.status === 'ok' ? 'passed' : 'failed',
            checks: verificationResults.map((result, index) => ({
              label: index === 0 ? 'Command exit' : 'Evidence captured',
              type: index === 0 ? 'command' : 'output',
              status: run.status === 'ok' ? 'passed' : 'failed',
              evidence: result,
              exitCode: index === 0 ? (run.exitCode ?? (run.status === 'ok' ? 0 : 1)) : undefined,
            })),
            conclusion: verificationResults.join(' '),
            recoverySuggested: run.status !== 'ok',
          },
          verificationResults,
          risk: {
            level: 'medium',
            reasons: ['E2E seeded workspace-write proof'],
            approvals: [],
          },
          summary: artifactSummary?.metaPreview || run.title,
        },
      })
    }
    bridge.dispatch({
      type: 'receipt/set',
      receipt: {
        kind: 'structured_command_receipt',
        id: receiptId,
        runId: run.id,
        sessionId: run.sessionId,
        commandId: run.id,
        session: {
          id: run.sessionId,
          createdAt: run.startedAt,
          updatedAt: run.updatedAt,
          projectRoot: run.projectRoot || run.cwd,
          source: run.source || 'e2e-seeded',
          platform: run.platform || 'linux-x64',
        },
        command: {
          input: run.command,
          cwd: run.cwd,
          startedAt: run.startedAt,
          endedAt: run.endedAt,
          exitCode: run.exitCode,
          ok: run.status === 'ok' ? true : run.status === 'failed' || run.status === 'interrupted' ? false : null,
          cancelled: run.status === 'interrupted',
          error: artifactSummary?.stderrPreview || '',
          risk: 'workspace-write',
        },
        artifacts: {
          stdoutChunks: artifactSummary?.stdoutChunks || 0,
          stderrChunks: artifactSummary?.stderrChunks || 0,
          metaChunks: artifactSummary?.metaChunks || 0,
          stdoutPreview: artifactSummary?.stdoutPreview || '',
          stderrPreview: artifactSummary?.stderrPreview || '',
          metaPreview: artifactSummary?.metaPreview || '',
          changedFiles: artifactSummary?.changedFiles || [],
          diffHints: artifactSummary?.diffHints || [],
          urls: [],
        },
      },
    })
  }, args)
}

async function openAgent(page: Page): Promise<void> {
  await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]').click()
  await page.waitForSelector('#agent-output, .rw-recovery-strip', { state: 'visible', timeout: 5000 })
}

async function openRunsInspector(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = (window as unknown as { __rinaE2EWorkbench?: { dispatch: (action: unknown) => void } }).__rinaE2EWorkbench
    if (!bridge) return
    bridge.dispatch({ type: 'view/centerSet', view: 'runs' })
  })
  await expect(page.locator('#runs-output')).toBeVisible()
}

async function openReceiptView(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = (window as unknown as { __rinaE2EWorkbench?: { dispatch: (action: unknown) => void } }).__rinaE2EWorkbench
    if (!bridge) throw new Error('E2E workbench bridge unavailable')
    bridge.dispatch({ type: 'ui/openDrawer', view: 'receipt' })
  })
  await expect(page.locator('#receipt-output .rw-receipt-panel')).toBeVisible()
}

test('proof recovery visual: failed build thread and proof', async () => {
  await withApp(async ({ app, page }) => {
    const now = new Date().toISOString()
    const fixture = {
      run: {
        id: 'visual_failed_build_run',
        sessionId: 'visual_failed_build_session',
        title: 'npm run build',
        command: 'npm run build',
        cwd: '/tmp/e2e-project',
        status: 'failed' as const,
        startedAt: now,
        updatedAt: now,
        endedAt: now,
        exitCode: 1,
        commandCount: 1,
        failedCount: 1,
        latestReceiptId: 'receipt_visual_failed_build',
        projectRoot: '/tmp/e2e-project',
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
        id: 'rina:visual:failed-build',
        role: 'rina' as const,
        content: [{ type: 'bubble', text: 'The build failed, and I kept the proof attached.' }],
      },
      receiptId: 'receipt_visual_failed_build',
      seedRuntimeProof: true,
    }

    await seedWorkbenchRunFixture(page, fixture)
    await seedStructuredReceipt(page, fixture)

    await openAgent(page)
    const failedBuildRun = page.locator('.rw-inline-runblock[data-run-id="visual_failed_build_run"]')
    await expect(failedBuildRun).toBeVisible()
    await expect(failedBuildRun.getByText(/Proof attached|Proof verified/i).first()).toBeVisible()
    await capture(page, 'failed-build-thread')

    await openReceiptView(page)
    await expect(page.getByRole('button', { name: 'Copy proof' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Export proof JSON/i })).toBeVisible()

    await app.evaluate(({ clipboard }) => clipboard.clear())
    await page.getByRole('button', { name: 'Copy proof' }).click()
    await expect
      .poll(async () => app.evaluate(({ clipboard }) => clipboard.readText()), { timeout: 10_000 })
      .toContain('RinaWarp proof receipt_visual_failed_build')

    await page.evaluate(() => {
      ;(window as any).__rinaReceiptExportText = ''
      ;(window as any).__rinaReceiptExportDownload = ''
      URL.createObjectURL = (blob: Blob) => {
        void blob.text().then((text) => {
          ;(window as any).__rinaReceiptExportText = text
        })
        return 'blob:rina-receipt-export'
      }
      HTMLAnchorElement.prototype.click = function () {
        ;(window as any).__rinaReceiptExportDownload = this.download
      }
    })
    await page.getByRole('button', { name: /Export proof JSON/i }).click()
    await expect.poll(async () => page.evaluate(() => String((window as any).__rinaReceiptExportText || '')), { timeout: 10_000 }).not.toBe('')
    const exported = await page.evaluate(() => {
      const text = String((window as any).__rinaReceiptExportText || '')
      return JSON.parse(text)
    })
    expect(exported.receiptId).toBe('receipt_visual_failed_build')
    expect(exported.timestamp).toBe(now)
    expect(exported.intent).toBe('structured_command_receipt')
    expect(exported.proofBlockIds).toContain('proof:visual_failed_build_run')
    expect(exported.verificationResult.results).toContain('Command exit')
    expect(exported.runtimeReceipt.id).toBe('receipt_visual_failed_build')
    expect(await page.evaluate(() => (window as any).__rinaReceiptExportDownload)).toBe('rinawarp-proof-receipt_visual_failed_build.json')

    await capture(page, 'failed-build-receipt')
  })
})

test('proof recovery visual: interrupted run recovery strip and proof', async () => {
  await withApp(async ({ page }) => {
    const now = new Date().toISOString()
    const workspaceKey = await seedProjectWorkspaceContext(page)
    const fixture = {
      run: {
        id: 'visual_interrupted_test_run',
        sessionId: 'visual_interrupted_test_session',
        title: 'npm test',
        command: 'npm test',
        cwd: workspaceKey,
        status: 'interrupted' as const,
        startedAt: now,
        updatedAt: now,
        endedAt: null,
        exitCode: 130,
        commandCount: 1,
        failedCount: 0,
        latestReceiptId: 'receipt_visual_interrupted_test',
        projectRoot: workspaceKey,
        restored: true,
      },
      artifactSummary: {
        stdoutChunks: 1,
        stderrChunks: 0,
        metaChunks: 1,
        stdoutPreview: 'PASS src/lib/check.test.ts',
        stderrPreview: '',
        metaPreview: 'run interrupted by user before full suite completed',
        changedFiles: ['src/lib/check.ts'],
        diffHints: ['tests are idempotent when rerun with the same env'],
      },
      message: {
        id: 'system:runs:restore:visual-interrupted-test',
        role: 'rina' as const,
        workspaceKey,
        content: [
          {
            type: 'reply-card',
            kind: 'recovery',
            label: 'I recovered your last session safely',
            bodyBlocks: [{ type: 'bubble', text: 'Receipts are intact. Retry tests with the same env or inspect the receipt first.' }],
          },
        ],
      },
      receiptId: 'receipt_visual_interrupted_test',
    }

    await seedWorkbenchRunFixture(page, fixture)
    await seedStructuredReceipt(page, fixture)

    await openAgent(page)
    await expect(page.locator('.rw-recovery-strip')).toBeVisible()
    await capture(page, 'interrupted-test-thread')

    await openReceiptView(page)
    await capture(page, 'interrupted-test-receipt')
  })
})

test('proof recovery visual: failed deploy inspector and proof', async () => {
  await withApp(async ({ page }) => {
    const now = new Date().toISOString()
    const workspaceKey = await seedProjectWorkspaceContext(page)
    const fixture = {
      run: {
        id: 'visual_failed_deploy_run',
        sessionId: 'visual_failed_deploy_session',
        title: 'wrangler deploy',
        command: 'wrangler deploy',
        cwd: workspaceKey,
        status: 'failed' as const,
        startedAt: now,
        updatedAt: now,
        endedAt: now,
        exitCode: 1,
        commandCount: 1,
        failedCount: 1,
        latestReceiptId: 'receipt_visual_failed_deploy',
        projectRoot: workspaceKey,
      },
      outputTail: 'wrangler deploy\nError: Authentication expired before publish completed.',
      artifactSummary: {
        stdoutChunks: 1,
        stderrChunks: 1,
        metaChunks: 1,
        stdoutPreview: 'wrangler deploy',
        stderrPreview: 'Error: Authentication expired before publish completed.',
        metaPreview: 'deploy failed before target state changed',
        changedFiles: ['website/wrangler.toml', 'website/workers/router.ts'],
        diffHints: ['inspect auth and deploy target before rerunning'],
      },
      message: {
        id: 'rina:visual:failed-deploy',
        role: 'rina' as const,
        content: [{ type: 'bubble', text: 'The deploy failed before publish completed, so I kept the receipt front and center.' }],
      },
      receiptId: 'receipt_visual_failed_deploy',
    }

    await seedWorkbenchRunFixture(page, fixture)
    await seedStructuredReceipt(page, fixture)

    await openRunsInspector(page)
    await expect(page.locator('#runs-output')).toBeVisible()
    await expect(page.locator('#runs-output .rw-run-block').first()).toBeVisible()
    await capture(page, 'failed-deploy-runs-inspector')

    await openReceiptView(page)
    await capture(page, 'failed-deploy-receipt')
  })
})

test('proof recovery visual: restored session thread stays understandable', async () => {
  await withApp(async ({ page }) => {
    const now = new Date().toISOString()
    const workspaceKey = await seedProjectWorkspaceContext(page)
    const fixture = {
      run: {
        id: 'visual_restored_run',
        sessionId: 'visual_restored_session',
        title: 'npm test',
        command: 'npm test',
        cwd: workspaceKey,
        status: 'interrupted' as const,
        startedAt: now,
        updatedAt: now,
        endedAt: null,
        exitCode: 130,
        commandCount: 1,
        failedCount: 0,
        latestReceiptId: 'receipt_visual_restored',
        projectRoot: workspaceKey,
        restored: true,
      },
      artifactSummary: {
        stdoutChunks: 1,
        stderrChunks: 0,
        metaChunks: 1,
        stdoutPreview: 'Restored session resumed from prior launch.',
        stderrPreview: '',
        metaPreview: 'latest run was interrupted safely and restored into the thread',
        changedFiles: [],
        diffHints: ['open receipt before rerunning if target state is unclear'],
      },
      message: {
        id: 'system:runs:restore:visual-restored-session',
        role: 'rina' as const,
        workspaceKey,
        content: [
          {
            type: 'reply-card',
            kind: 'recovery',
            label: 'I recovered your last session safely',
            badge: 'Restored',
            bodyBlocks: [
              { type: 'bubble', text: 'Your last test run stopped early. The receipt is intact, and the safest next move is still visible here.' },
            ],
            actions: [
              { label: 'Resume tests', runResume: 'visual_restored_run', className: 'is-primary' },
              { label: 'Inspect run', openRunsPanel: true, className: 'is-secondary' },
              { label: 'Open receipt', runReveal: 'receipt_visual_restored', className: 'is-secondary' },
            ],
          },
        ],
      },
      receiptId: 'receipt_visual_restored',
    }

    await seedWorkbenchRunFixture(page, fixture)
    await seedStructuredReceipt(page, fixture)

    await page.waitForSelector('.rw-recovery-strip', { state: 'visible', timeout: 10000 })
    await capture(page, 'restored-session-thread')
  })
})
