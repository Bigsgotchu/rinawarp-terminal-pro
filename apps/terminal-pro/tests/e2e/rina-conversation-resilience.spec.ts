import { expect, test, type Page } from '@playwright/test'
import { withApp } from './_app'

function agentTopbarTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')
}

async function sendPrompt(page: Page, prompt: string): Promise<void> {
  await page.locator('#agent-input').fill(prompt)
  await page.locator('#agent-send').click()
}

async function currentRunIds(page: Page): Promise<Set<string>> {
  return new Set(
    await page.locator('#agent-output .rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
  )
}

async function waitForAssistantReply(page: Page, beforeCount: number): Promise<string> {
  const thread = page.locator('#agent-output')
  await expect
    .poll(
      async () => {
        return await thread.locator('.rw-thread-message').count()
      },
      { timeout: 20_000 }
    )
    .toBeGreaterThan(beforeCount)
  const lastMessage = thread.locator('.rw-thread-message').last()
  await expect(lastMessage).toBeVisible()
  return ((await lastMessage.textContent()) || '').trim()
}

async function waitForThreadText(page: Page, pattern: RegExp): Promise<void> {
  await expect
    .poll(
      async () => {
        return ((await page.locator('#agent-output').textContent()) || '').trim()
      },
      { timeout: 20_000 }
    )
    .toMatch(pattern)
}

async function seedAnchoredRun(page: Page): Promise<string> {
  const runId = `run_anchor_${Date.now()}`
  const sessionId = `session_anchor_${Date.now()}`
  const now = new Date().toISOString()
  await page.evaluate(
    ({ runId, sessionId, now }) => {
      const bridge = (window as any).__rinaE2EWorkbench
      if (!bridge) throw new Error('E2E workbench bridge unavailable')
      const state = bridge.getState()
      const workspaceKey = state.workspaceKey
      bridge.dispatch({
        type: 'runs/upsert',
        run: {
          id: runId,
          sessionId,
          title: 'Trusted path: pwd',
          command: 'pwd',
          cwd: '/tmp/rinawarp-e2e-project',
          status: 'ok',
          startedAt: now,
          updatedAt: now,
          endedAt: now,
          exitCode: 0,
          commandCount: 1,
          failedCount: 0,
          latestReceiptId: `${runId}-receipt`,
          projectRoot: '/tmp/rinawarp-e2e-project',
          source: 'e2e-seeded',
          platform: 'linux-x64',
        },
      })
      bridge.dispatch({
        type: 'runs/setOutputTail',
        runId,
        tail: '/tmp/rinawarp-e2e-project\n',
      })
      bridge.dispatch({
        type: 'runs/setArtifactSummary',
        runId,
        summary: {
          stdoutChunks: 1,
          stderrChunks: 0,
          metaChunks: 1,
          stdoutPreview: '/tmp/rinawarp-e2e-project',
          stderrPreview: '',
          metaPreview: 'receipt ready',
          changedFiles: [],
          diffHints: [],
        },
      })
      bridge.dispatch({
        type: 'chat/add',
        msg: {
          id: `${runId}-message`,
          role: 'rina',
          ts: Date.now(),
          workspaceKey,
          runIds: [runId],
          content: [
            {
              type: 'text',
              text: 'Verified run complete. Receipt ready.',
            },
          ],
        },
      })
    },
    { runId, sessionId, now }
  )
  return runId
}

async function ensureProjectContext(page: Page): Promise<void> {
  const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
  const fixButton = page.getByRole('button', { name: 'Fix Project' }).first()
  if ((await buildButton.isVisible().catch(() => false)) || (await fixButton.isVisible().catch(() => false))) return
  const tryDemo = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await tryDemo.isVisible().catch(() => false)) {
    await tryDemo.click()
    await expect
      .poll(
        async () => (await buildButton.isVisible().catch(() => false)) || (await fixButton.isVisible().catch(() => false)),
        { timeout: 30_000 }
      )
      .toBe(true)
  }
}

async function triggerAnchoredRun(page: Page): Promise<void> {
  await seedAnchoredRun(page)
}

test('conversation resilience: vague messy ask reframes into inspect-first without starting a run', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, 'uh can you just make this work')
    const reply = await waitForAssistantReply(page, beforeCount)

    expect(reply).toMatch(/inspect|workspace|safest next step/i)
    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})

test('conversation resilience: proof-aware question does not accidentally execute', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await ensureProjectContext(page)
    await triggerAnchoredRun(page)
    await expect(page.locator('#agent-output .rw-inline-runblock')).toHaveCount(1, { timeout: 30_000 })

    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, 'be honest did that actually run')
    await waitForAssistantReply(page, beforeCount)
    await waitForThreadText(page, /verified run|proof trail|rerun|failed|proof-pending/i)

    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})

test('conversation resilience: frustrated input gets a grounded inspect-first response', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, "i'm tired of this failing")
    const reply = await waitForAssistantReply(page, beforeCount)

    expect(reply).toMatch(/workspace|latest run|inspect|proof/i)
    expect(reply).not.toMatch(/awesome|amazing|celebrate/i)
    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})

test('conversation resilience: casual turn stays social without losing work context', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, 'lol fair what do you think we should do next')
    const reply = await waitForAssistantReply(page, beforeCount)

    expect(reply).toMatch(/anchored|next move|inspect|safest step/i)
    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})

test('conversation resilience: ambiguous follow-up resolves against the last run without auto-rerunning', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await ensureProjectContext(page)
    await triggerAnchoredRun(page)
    await expect(page.locator('#agent-output .rw-inline-runblock')).toHaveCount(1, { timeout: 30_000 })

    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, 'do the last thing again')
    const reply = await waitForAssistantReply(page, beforeCount)

    expect(reply).toMatch(/treating that as|rerun it on the trusted path|last run/i)
    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})

test('conversation resilience: off-boundary ask redirects gracefully', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, 'write me a love poem about the moon')
    const reply = await waitForAssistantReply(page, beforeCount)

    expect(reply).toMatch(/best around real work|inspect the project|latest run/i)
    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})

test('conversation resilience: explicit preference statement is recognized without hidden write behavior', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    const beforeCount = await page.locator('#agent-output .rw-thread-message').count()
    const beforeRunIds = await currentRunIds(page)

    await sendPrompt(page, 'remember I like short answers')
    const reply = await waitForAssistantReply(page, beforeCount)

    expect(reply).toMatch(/explicit preference|owner-visible|settings > memory/i)
    expect(await currentRunIds(page)).toEqual(beforeRunIds)
  })
})
