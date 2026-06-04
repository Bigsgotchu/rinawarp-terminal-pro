import { expect, type Page } from '@playwright/test'

export type GoldenJourneyKind = 'build' | 'test' | 'deploy' | 'rollback' | 'memory-fix'

export async function openAgentThread(page: Page): Promise<void> {
  await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]').click()
  await expect(page.locator('#agent-input')).toBeVisible()
}

export async function ensureDemoProject(page: Page): Promise<void> {
  const demo = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await demo.isVisible().catch(() => false)) {
    await demo.click()
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible({ timeout: 30_000 })
  }
}

export async function seedGoldenThreadJourney(page: Page, kind: GoldenJourneyKind): Promise<string> {
  const runId = `golden-${kind}-${Date.now()}`
  await page.evaluate(
    ({ runId, kind }) => {
      const bridge = (window as { __rinaE2EWorkbench?: { getState: () => { workspaceKey: string }; dispatch: (a: unknown) => void } })
        .__rinaE2EWorkbench
      if (!bridge) throw new Error('E2E workbench bridge unavailable')
      const workspaceKey = bridge.getState().workspaceKey
      const now = Date.now()
      const prompts: Record<string, string> = {
        build: 'Build this project and show proof.',
        test: 'Run the tests and summarize failures.',
        deploy: 'Deploy this project with verification.',
        rollback: 'Apply the patch and roll back if verification fails.',
        'memory-fix': 'Fix the build using prior recovery pattern.',
      }
      const userText = prompts[kind] || prompts.build
      const rollback = kind === 'rollback'
      const verified = !rollback
      const exitCode = verified ? 0 : 1

      const receipt = {
        id: runId,
        sessionId: runId,
        workspaceId: workspaceKey,
        userIntent: userText,
        planId: runId,
        startedAt: new Date(now - 4200).toISOString(),
        completedAt: new Date(now).toISOString(),
        status: verified ? 'succeeded' : 'failed',
        fileChanges: kind === 'build' || kind === 'memory-fix' ? ['src/index.ts'] : [],
        commands:
          kind === 'build'
            ? [{ id: `${runId}:command`, command: 'pnpm build', cwd: workspaceKey, startedAt: new Date(now - 4200).toISOString(), completedAt: new Date(now).toISOString(), exitCode, stdout: '', stderr: '' }]
            : kind === 'test'
              ? [{ id: `${runId}:command`, command: 'pnpm test', cwd: workspaceKey, startedAt: new Date(now - 4200).toISOString(), completedAt: new Date(now).toISOString(), exitCode, stdout: '', stderr: '' }]
              : kind === 'deploy'
                ? [{ id: `${runId}:command`, command: 'pnpm run deploy', cwd: workspaceKey, startedAt: new Date(now - 4200).toISOString(), completedAt: new Date(now).toISOString(), exitCode, stdout: '', stderr: '' }]
                : [{ id: `${runId}:command`, command: 'pnpm build', cwd: workspaceKey, startedAt: new Date(now - 4200).toISOString(), completedAt: new Date(now).toISOString(), exitCode, stdout: '', stderr: '' }],
        mcpCalls: [],
        artifacts: [],
        verification: {
          status: verified ? 'passed' : 'failed',
          checks: [
            {
              label: rollback ? 'Verification failed; changes rolled back' : 'All checks passed',
              type: 'command',
              status: verified ? 'passed' : 'failed',
              evidence: verified ? 'Command completed successfully.' : 'Rollback applied after verification failure.',
              exitCode,
            },
          ],
          conclusion: rollback ? 'Verification failed; changes rolled back' : 'All checks passed',
          recoverySuggested: rollback,
        },
        risk: {
          level: 'low',
          reasons: [],
          approvals: [],
        },
        summary: verified ? 'Execution completed with proof.' : 'Verification failed; workspace restored from backup.',
      }

      const runBlock = {
        id: runId,
        runId,
        title: userText,
        summary: verified
          ? 'I ran 1 command, updated 1 file in 4s, and verification passed.'
          : 'Verification failed; workspace restored from backup.',
        command: receipt.commands[0].command,
        cwd: workspaceKey !== '__none__' ? workspaceKey : '/tmp/rinawarp-e2e-project',
        status: rollback ? 'rolled_back' : verified ? 'success' : 'failed',
        startedAt: now - 4200,
        completedAt: now,
        exitCode,
        receipts: [{ id: runId, label: 'execution receipt' }],
        timeline: [
          { type: 'execution.started', at: now - 4200, cognitionLabel: 'Starting execution' },
          { type: 'execution.progress', at: now - 4199, cognitionLabel: 'Running workspace checks' },
          {
            type: rollback ? 'transaction.rolled_back' : 'execution.completed',
            at: now,
            cognitionLabel: rollback ? 'Restored workspace backup' : 'Execution completed',
          },
        ],
        memoryNote: kind === 'memory-fix' ? 'prior successful build recovery pattern' : undefined,
      }

      const items = [
        { id: `user:${runId}`, type: 'user-message', text: userText, createdAt: now - 5000, workspaceKey },
        {
          id: `assistant:${runId}`,
          type: 'assistant-message',
          text: runBlock.summary,
          createdAt: now - 4500,
          workspaceKey,
          proofBacked: true,
        },
        {
          id: `plan:${runId}`,
          type: 'assistant-plan',
          summary: 'Operational plan',
          steps: ['Inspect workspace', 'Execute command', 'Verify outcome'],
          runId,
          createdAt: now - 4400,
          workspaceKey,
        },
        { id: `thread:run:${runId}`, type: 'run-block', run: runBlock, createdAt: now - 4000, workspaceKey },
        {
          id: `thread:cognition:${runId}`,
          type: 'cognition-stream',
          runId,
          lines: runBlock.timeline.map((event: { type: string; at: number; cognitionLabel?: string }) => ({
            ts: event.at,
            eventType: event.type,
            label: event.cognitionLabel || event.type,
          })),
          createdAt: now - 3500,
          workspaceKey,
        },
        ...(kind === 'memory-fix'
          ? [
              {
                id: `thread:memory:${runId}`,
                type: 'memory-note',
                runId,
                text: 'Using prior successful build recovery pattern.',
                createdAt: now - 3400,
                workspaceKey,
              },
            ]
          : []),
        {
          id: `thread:verify:${runId}`,
          type: 'verification',
          runId,
          results: receipt.verification.checks.map((check) => check.label),
          createdAt: now - 3000,
          workspaceKey,
        },
        { id: `thread:receipt:${runId}`, type: 'receipt', receipt, createdAt: now - 2500, workspaceKey },
      ]

      bridge.dispatch({ type: 'thread/replace', items })
      bridge.dispatch({ type: 'runBlocks/upsert', block: runBlock })
      bridge.dispatch({ type: 'executionReceipts/upsert', receipt })
      bridge.dispatch({
        type: 'runs/upsert',
        run: {
          id: runId,
          sessionId: runId,
          title: userText,
          command: receipt.commands[0].command,
          cwd: runBlock.cwd,
          status: verified ? 'ok' : 'failed',
          startedAt: receipt.startedAt,
          updatedAt: receipt.completedAt,
          endedAt: receipt.completedAt,
          exitCode,
          commandCount: 1,
          failedCount: verified ? 0 : 1,
          latestReceiptId: runId,
          projectRoot: runBlock.cwd,
          source: 'e2e-golden',
        },
      })
      bridge.dispatch({
        type: 'runs/setOutputTail',
        runId,
        tail: verified ? 'Build completed successfully.\n' : 'Verification failed — rollback applied.\n',
      })

      try {
        const storeKey = 'rinawarp.execution-receipts.v1'
        const existing = JSON.parse(localStorage.getItem(storeKey) || '{}') as Record<string, unknown>
        existing[runId] = receipt
        localStorage.setItem(storeKey, JSON.stringify(existing))
      } catch {
        // persistence is best-effort for e2e reload checks
      }
    },
    { runId, kind },
  )
  return runId
}

export async function assertCanonicalThreadProofChain(page: Page, runId: string): Promise<void> {
  const thread = page.locator('#agent-output')
  await expect(thread.locator('[data-thread-item="user-message"]').last()).toBeVisible()
  await expect(thread.locator('[data-thread-item="assistant-plan"]')).toBeVisible()
  await expect(thread.locator('[data-thread-item="cognition-stream"]')).toBeVisible()
  await expect(thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)).toBeVisible()
  await expect(thread.locator('[data-thread-item="verification"]')).toBeVisible()
  const receipt = thread.locator('[data-thread-item="receipt"]').last()
  await expect(receipt).toBeVisible()
  await expect(receipt).toContainText(runId)
  await expect(receipt.getByRole('button', { name: 'Replay' })).toBeVisible()
}
