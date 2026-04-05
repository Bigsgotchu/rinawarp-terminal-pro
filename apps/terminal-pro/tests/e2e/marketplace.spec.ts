import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { launchApp } from './_launch'

const premiumAgentName = 'docker-cleanup'

function seedEntitlement(userDataSuffix: string, args: { tier: 'pro' | 'creator' | 'team'; customerId?: string }): void {
  const userDataDir = path.join(os.tmpdir(), `rinawarp-e2e-${userDataSuffix}`)
  fs.mkdirSync(userDataDir, { recursive: true })
  fs.writeFileSync(
    path.join(userDataDir, 'license-entitlement.json'),
    JSON.stringify(
      {
        tier: args.tier,
        token: 'e2e-local-entitlement',
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        customerId: args.customerId || 'cus_e2e_marketplace',
        verifiedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        status: 'active',
      },
      null,
      2
    ),
    'utf8'
  )
}

test('starter tier shows premium marketplace agent as locked', async () => {
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-marketplace-starter-home-'))
  const app = await launchApp({
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: `marketplace-starter-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await page.locator('[data-shell-source="shell_activitybar"][data-shell-nav="marketplace"][aria-label="Capabilities"]').click()

    const card = page.locator(`.rw-market-card[data-agent-name="${premiumAgentName}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).toContainText('Upgrade required')
    await expect(card.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('starter marketplace upgrade path explains the real Pro unlocks', async () => {
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-marketplace-upgrade-home-'))
  const app = await launchApp({
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: `marketplace-upgrade-copy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await page.locator('[data-shell-source="shell_activitybar"][data-shell-nav="marketplace"][aria-label="Capabilities"]').click()

    const card = page.locator(`.rw-market-card[data-agent-name="${premiumAgentName}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })

    await card.getByRole('button', { name: 'Upgrade to Pro' }).click()

    const dialog = page.getByRole('dialog', { name: 'Upgrade to Pro' })
    await expect(dialog).toBeVisible({ timeout: 20_000 })
    await expect(dialog).toContainText(/Unlock premium execution|Upgrade to Pro/i)
    await expect(dialog).toContainText(/capability packs|installable agents|safe fixes/i)
    await expect(dialog).toContainText(/Receipts|support bundles|audit-backed/i)
    await expect(dialog.getByRole('button', { name: 'I’ve paid — Refresh Pro status' })).toBeVisible()
  } finally {
    await app.close()
  }
})

test('pro tier can install a premium marketplace agent locally', async () => {
  const suffix = `marketplace-pro-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-marketplace-pro-home-'))
  seedEntitlement(suffix, { tier: 'pro' })

  const app = await launchApp({
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })

  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)

    await page.locator('[data-shell-source="shell_activitybar"][data-shell-nav="marketplace"][aria-label="Capabilities"]').click()

    const card = page.locator(`.rw-market-card[data-agent-name="${premiumAgentName}"]`)
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).toContainText(/Paid pack|Installable now|Ready in thread/)

    const installButton = card.getByRole('button', { name: 'Install' })
    await expect(installButton).toBeVisible()
    await installButton.click()

    await expect(card.getByRole('button', { name: 'Installed' })).toBeVisible({ timeout: 20_000 })
  } finally {
    await app.close()
  }
})
