import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { withPackagedApp } from './_app'

test.setTimeout(120_000)

function freshHomeEnv(suffix: string): Record<string, string> {
  const cleanHome = path.join(os.tmpdir(), `rinawarp-daily-driver-home-${suffix}`)
  fs.mkdirSync(cleanHome, { recursive: true })
  return {
    HOME: cleanHome,
    XDG_CONFIG_HOME: path.join(cleanHome, '.config'),
    XDG_DATA_HOME: path.join(cleanHome, '.local', 'share'),
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  }
}

function writeCloudAuthFile(authFilePath: string, token: string): void {
  fs.mkdirSync(path.dirname(authFilePath), { recursive: true })
  fs.writeFileSync(
    authFilePath,
    JSON.stringify({ authToken: token, updatedAt: new Date().toISOString() }, null, 2),
    { encoding: 'utf8', mode: 0o600 }
  )
}

test('v1.8 daily-driver: packaged Settings -> License exposes token + billing controls', async () => {
  const suffix = `pkg-license-surface-${Date.now()}`
  const env = freshHomeEnv(suffix)

  await withPackagedApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('license'))

    await expect(page.locator('#rw-settings')).toBeVisible()
    await expect(page.locator('#rw-settings')).toContainText('License')
    await expect(page.locator('#rw-settings')).toContainText('Rina Cloud Account')

    await expect(page.locator('#rw-cloud-token')).toBeVisible()
    await expect(page.locator('#rw-cloud-save-token-btn')).toBeVisible()
    await expect(page.locator('#rw-cloud-clear-token-btn')).toBeVisible()

    await expect(page.locator('#rw-cloud-email')).toBeVisible()
    await expect(page.locator('#rw-cloud-upgrade-btn')).toBeVisible()
    await expect(page.locator('#rw-cloud-portal-btn')).toBeVisible()

    await page.evaluate(() => window.__rinaSettings?.close())
    await expect(page.locator('#rw-settings')).toBeHidden()
    await expect(page.getByPlaceholder('Ask Rina anything...')).toBeVisible()
  }, env)
})

test('v1.8 daily-driver: packaged offline/cloud-unavailable state stays clear and non-blocking', async () => {
  const suffix = `pkg-offline-cloud-${Date.now()}`
  const env = freshHomeEnv(suffix)
  const authFilePath = path.join(env.HOME!, '.rinawarp-terminal-pro', 'rina-cloud-auth.json')
  writeCloudAuthFile(authFilePath, 'e2e-offline-auth-token')

  await withPackagedApp(async ({ page }) => {
    await page.context().setOffline(true)

    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await page.evaluate(() => window.__rinaSettings?.open('license'))

    await expect(page.locator('#rw-settings')).toBeVisible()
    await expect(page.locator('#rw-settings')).toContainText('Rina Cloud Account')

    await page.locator('#rw-cloud-refresh-btn').click()

    await expect(page.locator('#rw-settings')).toContainText(/unavailable/i)
    await expect(page.locator('#rw-cloud-status')).toContainText(/unavailable|failed|offline|fetch/i)

    await page.evaluate(() => window.__rinaSettings?.close())
    await expect(page.locator('#rw-settings')).toBeHidden()
    await expect(page.getByPlaceholder('Ask Rina anything...')).toBeVisible()
  }, {
    ...env,
    RINA_CLOUD_API_BASE: 'https://rina-cloud.invalid',
    RINAWARP_CLOUD_ACCOUNT_FILE: authFilePath,
  })
})

