import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withApp } from './_app'

test.setTimeout(180_000)

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'e2e/screenshots')

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

function agentThreadTab(page: Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')
}

function marketplaceNav(page: Page) {
  return page.locator('[data-shell-owned="true"][data-shell-nav="marketplace"]').first()
}

function settingsNav(page: Page) {
  return page.locator('[data-shell-owned="true"][data-shell-nav="settings"]').first()
}

async function capture(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  })
}

test('Agent Shell visual smoke: launches styled Agent Thread', async () => {
  const env = freshHomeEnv(`agent-shell-smoke-${Date.now()}`)

  await withApp(async ({ page }) => {
    await agentThreadTab(page).click()

    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 })
    const bodyBackground = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bodyBackground).not.toBe('rgb(255, 255, 255)')

    await expect(page.locator('#rw-app')).toBeVisible()
    await expect(page.locator('.rw-workbench-shell')).toBeVisible()
    await expect(page.locator('#panel-agent')).toBeVisible()
    await expect(page.locator('#panel-agent')).toContainText('Agent Thread')
    await expect(page.locator('#agent-output')).toBeVisible()
    await expect(page.locator('#agent-input')).toBeVisible()
    await expect(page.locator('#agent-send')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Proof' })).toBeVisible()

    await page.locator('#agent-input').fill('What does this project do?')
    await expect(page.locator('#agent-input')).toHaveValue('What does this project do?')

    await capture(page, 'agent-shell-initial-launch')
  }, env)
})

test('Agent Shell visual smoke: routes Marketplace and Settings without legacy panel IDs', async () => {
  const env = freshHomeEnv(`agent-shell-routes-${Date.now()}`)

  await withApp(async ({ page }) => {
    await marketplaceNav(page).click()
    await expect(page.locator('#panel-marketplace')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#panel-marketplace')).toContainText('Marketplace')
    await expect(page.locator('#marketplace-output')).toBeVisible()
    await capture(page, 'agent-shell-marketplace-route')

    await settingsNav(page).click()
    await expect(page.locator('#rw-settings')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#rw-settings')).toContainText('Settings')
    await capture(page, 'agent-shell-settings-route')
  }, env)
})
