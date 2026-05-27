import { expect, test } from '@playwright/test'
import { waitForAppReady, waitForFirstWindow } from './_app'
import { launchApp } from './_launch'

/**
 * Tier 1 product smoke (<3 min target in CI):
 * boot → agent thread → canonical proof artifacts render.
 */
test('tier1: agent thread renders run block and receipt', async () => {
  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: `tier1-smoke-${Date.now()}`,
  })

  try {
    const page = await waitForFirstWindow(app)
    await page.waitForLoadState('domcontentloaded')
    await waitForAppReady(page)

    await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]').click()
    await expect(page.locator('#agent-input')).toBeVisible()

    const runId = `tier1-smoke-${Date.now()}`
    await page.evaluate((id) => {
      const bridge = (window as { __rinaE2EWorkbench?: { getState: () => { workspaceKey: string }; dispatch: (a: unknown) => void } })
        .__rinaE2EWorkbench
      if (!bridge) throw new Error('E2E workbench bridge unavailable')
      const workspaceKey = bridge.getState().workspaceKey
      const now = Date.now()
      const receipt = {
        runId: id,
        actionsPerformed: ['inspect', 'execute'],
        filesChanged: [],
        commandsExecuted: ['pnpm build'],
        verificationResults: ['All checks passed'],
        rollbackOccurred: false,
        exitCode: 0,
        startedAt: now - 2000,
        completedAt: now,
      }
      const runBlock = {
        id,
        runId: id,
        title: 'Tier 1 build smoke',
        summary: 'Build smoke passed.',
        command: 'pnpm build',
        cwd: workspaceKey,
        status: 'success',
        startedAt: receipt.startedAt,
        completedAt: receipt.completedAt,
        exitCode: 0,
        receipts: [{ id, label: 'execution receipt' }],
        timeline: [{ type: 'execution.completed', at: now, cognitionLabel: 'Execution completed' }],
      }
      bridge.dispatch({
        type: 'thread/replace',
        items: [
          { id: `user:${id}`, type: 'user-message', text: 'Build this project', createdAt: now - 3000, workspaceKey },
          {
            id: `assistant:${id}`,
            type: 'assistant-message',
            text: 'Build smoke passed with proof attached.',
            createdAt: now - 2500,
            workspaceKey,
            proofBacked: true,
          },
          { id: `thread:run:${id}`, type: 'run-block', run: runBlock, createdAt: now - 2000, workspaceKey },
          {
            id: `thread:cognition:${id}`,
            type: 'cognition-stream',
            runId: id,
            lines: [{ ts: now, eventType: 'execution.completed', label: 'Execution completed' }],
            createdAt: now - 1500,
            workspaceKey,
          },
          { id: `thread:receipt:${id}`, type: 'receipt', receipt, createdAt: now - 1000, workspaceKey },
        ],
      })
      bridge.dispatch({ type: 'runBlocks/upsert', block: runBlock })
      bridge.dispatch({ type: 'executionReceipts/upsert', receipt })
    }, runId)

    const thread = page.locator('#agent-output')
    await expect(thread.locator('[data-thread-item="user-message"]')).toBeVisible({ timeout: 15_000 })
    await expect(thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)).toBeVisible({ timeout: 15_000 })
    await expect(thread.locator('[data-thread-item="receipt"]')).toContainText(runId)
  } finally {
    await app.close()
  }
})
