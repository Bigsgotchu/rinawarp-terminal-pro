import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withPackagedApp } from './_app'

test.setTimeout(120_000)

function freshHomeEnv(suffix: string): Record<string, string> {
  const cleanHome = path.join(os.tmpdir(), `rinawarp-packaged-home-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })
  return {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  }
}

test('packaged first-run journey: customer can find workspace, settings, and a sane reply path', async () => {
  const env = freshHomeEnv(`first-run-${Date.now()}`)

  await withPackagedApp(async ({ page }) => {
    await expect(page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]')).toBeVisible()
    await expect(page.locator('#workspace-picker')).toBeVisible()
    await expect(page.locator('#workspace-picker')).toContainText(/Choose workspace|Workspace:/i)
    await expect(page.locator('#status-bar')).toBeVisible()
    await expect(page.locator('#status-bar')).toContainText(/Rina workbench/i)
    await expect(page.locator('#status-bar')).toContainText(/Workspace:/i)

    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    const settingsButton = page.locator('[data-shell-source="shell_activitybar"][data-shell-nav="settings"]')
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()
    await expect(page.locator('#rw-settings')).toBeVisible()
    await page.locator('#rw-settings [data-settings-tab="general"]').click()
    await expect(page.locator('#rw-settings')).toContainText(/Choose workspace|Open your own project or try a demo project/i)
    await page.locator('#rw-settings [data-settings-tab="memory"]').click()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)
    await page.keyboard.press('Escape')
    await expect(page.locator('#rw-settings')).toBeHidden()

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('rina:workspace-selected', { detail: { path: '/home/karina/Downloads' } }))
    })
    await expect(page.locator('#workspace-picker')).toContainText(/Workspace: Downloads/i)
    await expect(page.locator('[data-agent-section="workspace-setup"]')).toContainText(/may not be the right project folder/i)

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('rina:workspace-selected', {
          detail: { path: '/home/karina/Documents/rinawarp-terminal-pro' },
        })
      )
    })
    await expect(page.locator('#workspace-picker')).toContainText(/Workspace: rinawarp-terminal-pro/i)
    await expect(page.locator('[data-agent-section="workspace-setup"]')).toHaveCount(0)

    await page.locator('#agent-input').fill('hi')
    await page.locator('#agent-send').click()
    await expect(page.locator('#agent-output')).toContainText(/ready|help|workspace|inspect/i, { timeout: 30_000 })
    await expect(page.locator('#agent-output')).not.toContainText(/I need one anchor before I act/i)

    await page.locator('#agent-input').fill('what can u do')
    await page.locator('#agent-send').click()
    await expect(page.locator('#agent-output')).toContainText(/I can help with project work|explain runs|inspect receipts|stay grounded/i, {
      timeout: 30_000,
    })
    await expect(page.locator('#agent-output')).not.toContainText(/starting a verification run/i)

    const beforeRunCount = await page.locator('.rw-inline-runblock').count()
    await page.locator('#agent-input').fill('scan yourself')
    await page.locator('#agent-send').click()
    await expect(page.locator('#agent-output')).toContainText(/checking the current workspace and app state now/i, {
      timeout: 30_000,
    })
    await expect(page.locator('#agent-output')).not.toContainText(/Which workspace should I inspect\?/i)
    await expect
      .poll(async () => page.locator('.rw-inline-runblock').count(), { timeout: 30_000 })
      .toBeGreaterThan(beforeRunCount)
  }, env)
})
