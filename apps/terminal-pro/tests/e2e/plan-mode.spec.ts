import { expect, test, type Page } from '@playwright/test'
import { withApp } from './_app'

async function sendPrompt(page: Page, prompt: string): Promise<void> {
  await page.locator('#agent-input').fill(prompt)
  await page.locator('#agent-send').click()
}

async function ensureProjectContext(page: Page): Promise<void> {
  const demoButton = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click()
    await expect(page.getByRole('button', { name: 'Fix Project' }).first()).toBeVisible({ timeout: 30_000 })
  }
}

test('plan mode: review-first prompt produces a proof-backed plan summary and run output', async () => {
  await withApp(async ({ page }) => {
    await page.getByRole('button', { name: 'Agent' }).click()
    await ensureProjectContext(page)

    const thread = page.locator('#agent-output')
    const beforeRunCount = await page.locator('#agent-output .rw-inline-runblock').count()

    await sendPrompt(page, 'Review the build issue first, make a plan, and wait for me to approve execution.')

    await expect
      .poll(async () => page.locator('#agent-output .rw-inline-runblock').count(), { timeout: 30_000 })
      .toBeGreaterThan(beforeRunCount)

    await expect(thread).toContainText(/I mapped the build into \d+ proof-backed steps/i, { timeout: 30_000 })
    await expect(thread).toContainText(/Starting plan:/i, { timeout: 30_000 })
    await expect(thread).toContainText(/Plan .* completed/i, { timeout: 30_000 })
  })
})
