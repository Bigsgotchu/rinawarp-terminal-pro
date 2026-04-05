import { expect, test } from '@playwright/test'
import { withApp } from './_app'

async function ensureProjectContext(page: import('@playwright/test').Page): Promise<void> {
  const demoButton = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click()
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible({ timeout: 30_000 })
  }
}

async function triggerBuildIntent(page: import('@playwright/test').Page): Promise<void> {
  const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
  if (await buildButton.isVisible().catch(() => false)) {
    await buildButton.click()
    return
  }
  const input = page.locator('#agent-input')
  await expect(input).toBeVisible()
  await input.fill('Build this project and tell me what fails.')
  await page.locator('#agent-send').click()
}

test('agent smoke: prompt chip adds new thread activity', async () => {
  await withApp(async ({ page }) => {
    const thread = page.locator('#agent-output')
    await expect(thread).toBeVisible()
    await ensureProjectContext(page)

    const beforeCount = await thread.locator('.rw-thread-message').count()

    await triggerBuildIntent(page)

    await expect
      .poll(async () => {
        return await thread.locator('.rw-thread-message').count()
      }, { timeout: 15000 })
      .toBeGreaterThan(beforeCount)
  })
})

test('agent smoke: help prompt is handled by Rina instead of shelling plain English', async () => {
  await withApp(async ({ page }) => {
    const thread = page.locator('#agent-output .rw-thread-message')
    const beforeCount = await thread.count()

    const input = page.locator('#agent-input')
    await expect(input).toBeVisible()
    await input.fill('What can you do?')
    await page.locator('#agent-send').click()

    await expect
      .poll(async () => {
        return await thread.count()
      }, { timeout: 15000 })
      .toBeGreaterThan(beforeCount)

    const newMessages = await thread.evaluateAll((nodes, previous) => {
      return nodes.slice(previous as number).map((node) => node.textContent?.trim() || '')
    }, beforeCount)

    expect(newMessages.join('\n')).toMatch(/I can help with project work|I can help build and test now|choose the safest next step/i)
    expect(newMessages.join('\n')).not.toContain('Command failed: What can you do?')
  })
})

test('agent smoke: build prompt executes a real project command', async () => {
  await withApp(async ({ page }) => {
    const thread = page.locator('#agent-output')
    await ensureProjectContext(page)
    const beforeCount = await thread.locator('.rw-thread-message').count()
    const beforeRunIds = new Set(
      await thread.locator('.rw-inline-runblock').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-run-id') || ''))
    )

    await triggerBuildIntent(page)

    await expect
      .poll(async () => {
        return await thread.locator('.rw-thread-message').count()
      }, { timeout: 20000 })
      .toBeGreaterThan(beforeCount)

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
    await expect(runBlock.locator('.rw-inline-runblock-command code')).toContainText(/build|npm|pnpm|yarn/i)
  })
})
