import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withPackagedApp } from './_app'

test.setTimeout(180_000)

function freshHomeEnv(suffix: string): Record<string, string> {
  const cleanHome = path.join(os.tmpdir(), `rinawarp-smoke-home-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })
  return {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  }
}

test('packaged app Agent Thread visual smoke test', async () => {
  const env = freshHomeEnv(`agent-thread-smoke-${Date.now()}`)

  await withPackagedApp(async ({ page }) => {
    // 1. Verify app launches with core UI
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 })

    // 2. Verify Rina panel is visible (Agent Thread UI)
    const rinaPanel = page.getByTestId('rina-panel')
    await expect(rinaPanel).toBeVisible()

    // 3. Verify chat interface is visible
    const rinaChat = page.getByTestId('rina-chat')
    await expect(rinaChat).toBeVisible()

    // 4. Verify Composer is visible (use specific test id to avoid duplicates)
    const composer = page.getByTestId('rina-chat-input')
    await expect(composer).toBeVisible()

    // Screenshot: initial-app-launch.png
    await page.screenshot({
      path: 'apps/terminal-pro/e2e/screenshots/initial-app-launch.png',
      fullPage: true,
    })

    // 5. Type "What does this project do?" and submit
    const testPrompt = 'What does this project do?'
    await composer.fill(testPrompt)
    await page.getByTestId('rina-chat-send').click()

    // 6. Verify user message appears in chat history
    await expect(page.getByText(testPrompt)).toBeVisible({ timeout: 15_000 })

    // 7. Wait for Rina response
    await expect(page.locator('.text-zinc-100').first()).toBeVisible({ timeout: 45_000 })

    // Screenshot: repo-understanding-response.png
    await page.screenshot({
      path: 'apps/terminal-pro/e2e/screenshots/repo-understanding-response.png',
      fullPage: true,
    })
  }, env)
})

test('packaged app disk diagnostic visual smoke test', async () => {
  const env = freshHomeEnv(`disk-diagnostic-smoke-${Date.now()}`)

  await withPackagedApp(async ({ page }) => {
    await expect(page.getByTestId('rina-panel')).toBeVisible()

    const composer = page.getByTestId('rina-chat-input')
    await composer.fill('Why is my disk full?')
    await page.getByTestId('rina-chat-send').click()

    // Agent Thread should show diagnostic response
    await expect(page.getByText(/Why is my disk full/)).toBeVisible({ timeout: 15_000 })

    // Check for diagnostic-related content or response
    const hasContent = await page
      .locator('text=/disk|diagnosis|cleanup|full/i')
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasContent).toBe(true)

    await page.screenshot({
      path: 'apps/terminal-pro/e2e/screenshots/disk-diagnostic-response.png',
      fullPage: true,
    })
  }, env)
})

test('packaged app TypeScript fix visual smoke test', async () => {
  const env = freshHomeEnv(`ts-fix-smoke-${Date.now()}`)

  await withPackagedApp(async ({ page }) => {
    await expect(page.getByTestId('rina-panel')).toBeVisible()

    const composer = page.getByTestId('rina-chat-input')
    await composer.fill('Fix the TypeScript error in this repo')
    await page.getByTestId('rina-chat-send').click()

    // Wait for response
    await expect(page.getByText(/Fix the TypeScript error/)).toBeVisible({ timeout: 15_000 })

    // Check for any response content
    const hasResponse = await page.locator('.text-zinc-100').first().isVisible().catch(() => false)
    expect(hasResponse).toBe(true)

    await page.screenshot({
      path: 'apps/terminal-pro/e2e/screenshots/ts-fix-response.png',
      fullPage: true,
    })
  }, env)
})