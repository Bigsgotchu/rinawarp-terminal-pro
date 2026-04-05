import { expect, test } from '@playwright/test'
import { withApp } from './_app'

function agentTopbarTab(page: import('@playwright/test').Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')
}

function runsInspectorTopbarTab(page: import('@playwright/test').Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="runs"][aria-label="Runs Inspector"]')
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

test('trust smoke: clean launch lands on the Agent thread', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()

    await expect(page.locator('#agent-input')).toBeVisible()
    await expect(page.locator('#agent-input')).toHaveAttribute('placeholder', /Tell Rina what to do\.?/)
    await expect(page.getByRole('button', { name: 'Open Project' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try Demo Project' }).first()).toBeVisible()
  })
})

test('trust smoke: starter intent creates a proof-backed inline run block', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeMessageCount = await thread.locator('.rw-thread-message').count()
    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
    if (await buildButton.isVisible().catch(() => false)) {
      await buildButton.click()
    } else {
      await sendPrompt(page, 'Build this project and tell me what fails.')
    }

    await expect
      .poll(async () => thread.locator('.rw-thread-message').count(), { timeout: 20_000 })
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
    await expect(runBlock).toContainText(runId)
  })
})

test('trust smoke: runs inspector reflects the same run created in the Agent thread', async () => {
  await withApp(async ({ page }) => {
    await agentTopbarTab(page).click()
    await ensureProjectContext(page)
    const thread = page.locator('#agent-output')
    await expect(page.locator('#agent-input')).toBeVisible()

    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    const runTestsButton = page.getByRole('button', { name: 'Run tests' }).first()
    if (await runTestsButton.isVisible().catch(() => false)) {
      await runTestsButton.click()
    } else {
      await sendPrompt(page, 'Run the tests and summarize the failures.')
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

    const threadRunBlock = thread.locator(`.rw-inline-runblock[data-run-id="${runId}"]`)
    await expect(threadRunBlock).toBeVisible({ timeout: 30_000 })

    await runsInspectorTopbarTab(page).click()

    const inspectorRunBlock = page.locator(`.rw-run-block[data-run-id="${runId}"]`)
    await expect(inspectorRunBlock).toBeVisible({ timeout: 20_000 })
    await expect(inspectorRunBlock).toContainText(runId)
  })
})
