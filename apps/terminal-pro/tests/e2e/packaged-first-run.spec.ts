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
    await expect(page.getByText('Rina Terminal Pro')).toBeVisible()
    await expect(page.getByText('AI-Powered Development Assistant')).toBeVisible()
    await expect(page.getByPlaceholder('Ask Rina anything...')).toBeVisible()
    await expect(page.locator('[data-agent-section="recovery"]')).toContainText(/I recovered your last session/i)
    await expect(page.locator('[data-agent-section="recovery"]')).toContainText(/everything looks safe to continue/i)
    await expect(page.getByRole('button', { name: 'Resume Fix' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'View Details' })).toBeVisible()

    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('general'))
    await expect(page.locator('#rw-settings')).toBeVisible()
    await page.locator('#rw-settings [data-settings-tab="general"]').click()
    await expect(page.locator('#rw-settings')).toContainText(/workspace|project|open/i)
    await page.locator('#rw-settings [data-settings-tab="memory"]').click()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)
    await page.evaluate(() => window.__rinaSettings?.close())
    await expect(page.locator('#rw-settings')).toBeHidden()
  }, env)
})

test('packaged app persists memory profile across restart', async () => {
  const env = freshHomeEnv(`restart-persistence-${Date.now()}`)
  const preferredName = `Karina ${Date.now()}`

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('memory'))
    await expect(page.locator('#rw-settings')).toBeVisible()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)

    await page.locator('#rw-memory-preferred-name').fill(preferredName)
    await page.locator('#rw-memory-save-profile').click()
    await expect(page.locator('#rw-memory-feedback')).toContainText(/profile memory saved/i)
  }, env)

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('memory'))
    await expect(page.locator('#rw-settings')).toBeVisible()
    await expect(page.locator('#rw-memory-operational-store-badge')).toHaveText(/SQLite/i)
    await expect(page.locator('#rw-memory-preferred-name')).toHaveValue(preferredName)
  }, env)
})
