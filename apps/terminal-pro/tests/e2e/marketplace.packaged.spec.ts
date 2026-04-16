import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { withPackagedApp } from './_app'

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
        customerId: args.customerId || 'cus_e2e_marketplace_packaged',
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

test('packaged starter tier keeps premium marketplace locked', async () => {
  const suffix = `marketplace-packaged-starter-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-marketplace-packaged-starter-home-'))

  await withPackagedApp(async ({ page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)
    await page.waitForFunction(() => typeof (window as any).rina?.capabilityPacks === 'function')

    const premiumState = await page.evaluate(async (agentName) => {
      const result = await (window as any).rina.capabilityPacks()
      const capabilities = Array.isArray(result?.capabilities) ? result.capabilities : []
      const byName = capabilities.find((pack: any) => String(pack?.key || '').includes(agentName))
      const paidPack = byName || capabilities.find((pack: any) => pack?.tier === 'paid' || Number(pack?.price || 0) > 0)
      return {
        ok: Boolean(result?.ok),
        key: paidPack?.key || null,
        installState: paidPack?.installState || null,
      }
    }, premiumAgentName)

    expect(premiumState.ok).toBeTruthy()
    expect(premiumState.key).toBeTruthy()
    expect(premiumState.installState).toBe('upgrade-required')

    const blockedInstall = await page.evaluate(async (agentName) => {
      return await (window as any).rina.installMarketplaceAgent({ name: agentName })
    }, premiumAgentName)
    expect(blockedInstall?.ok).toBeFalsy()
    expect(String(blockedInstall?.error || '')).toMatch(/upgrade|pro|paid|license|tier/i)
  }, {
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })
})

test('packaged pro tier installs premium marketplace agent', async () => {
  const suffix = `marketplace-packaged-pro-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-marketplace-packaged-pro-home-'))
  seedEntitlement(suffix, { tier: 'pro' })

  await withPackagedApp(async ({ page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)
    await page.waitForFunction(() => typeof (window as any).rina?.installMarketplaceAgent === 'function')

    const installResult = await page.evaluate(async (agentName) => {
      return await (window as any).rina.installMarketplaceAgent({ name: agentName })
    }, premiumAgentName)
    expect(installResult?.ok).toBeTruthy()

    const installed = await page.evaluate(async () => {
      return await (window as any).rina.installedAgents()
    })
    const installedAgents = Array.isArray(installed?.agents) ? installed.agents : []
    expect(installedAgents.some((agent: any) => agent?.name === premiumAgentName)).toBeTruthy()
  }, {
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })
})

test('packaged team tier installs premium marketplace agent', async () => {
  const suffix = `marketplace-packaged-team-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const isolatedHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rinawarp-marketplace-packaged-team-home-'))
  seedEntitlement(suffix, { tier: 'team' })

  await withPackagedApp(async ({ page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => (window as any).RINAWARP_READY === true)
    await page.waitForFunction(() => typeof (window as any).rina?.installMarketplaceAgent === 'function')

    const installResult = await page.evaluate(async (agentName) => {
      return await (window as any).rina.installMarketplaceAgent({ name: agentName })
    }, premiumAgentName)
    expect(installResult?.ok).toBeTruthy()

    const installed = await page.evaluate(async () => {
      return await (window as any).rina.installedAgents()
    })
    const installedAgents = Array.isArray(installed?.agents) ? installed.agents : []
    expect(installedAgents.some((agent: any) => agent?.name === premiumAgentName)).toBeTruthy()
  }, {
    HOME: isolatedHome,
    RINAWARP_E2E_USER_DATA_SUFFIX: suffix,
  })
})
