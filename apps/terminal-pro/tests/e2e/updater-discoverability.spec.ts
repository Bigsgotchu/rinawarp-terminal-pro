import { expect, test } from '@playwright/test'
import { withApp } from './_app'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

async function ensureProjectContext(page) {
  const buildButton = page.getByRole('button', { name: 'Build this project' }).first()
  const fixButton = page.getByRole('button', { name: 'Plan a fix' }).first()
  if ((await buildButton.isVisible().catch(() => false)) || (await fixButton.isVisible().catch(() => false))) return
  const tryDemo = page.getByRole('button', { name: 'Try Demo Project' }).first()
  if (await tryDemo.isVisible().catch(() => false)) {
    await tryDemo.click()
    await expect
      .poll(
        async () => (await buildButton.isVisible().catch(() => false)) || (await fixButton.isVisible().catch(() => false)),
        { timeout: 30_000 }
      )
      .toBe(true)
  }
}

test('updater discoverability: version, settings, updates, and about are visible', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await ensureProjectContext(page)

    await expect(page.getByText('RinaWarp Terminal Pro').first()).toBeVisible()
    await expect(page.locator('#rw-chrome-version')).toHaveText(/v1\.8\.2-beta/)
    await expect(page.locator('#rw-chrome-channel')).toHaveText(/stable|beta|alpha/)

    const settingsButton = page.getByRole('button', { name: 'Open settings' })
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()

    const settings = page.locator('#rw-settings')
    await expect(settings).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Updates' })).toBeVisible()

    await page.getByRole('tab', { name: 'Updates' }).click()
    await expect(page.getByRole('heading', { name: 'Updates & Trust' })).toBeVisible()
    await expect(page.locator('#rw-updates-summary')).toContainText('Current Version')
    await expect(page.locator('#rw-updates-summary')).toContainText('Channel')
    await expect(page.locator('#rw-updates-summary')).toContainText('Update Status')
    await expect(page.getByRole('button', { name: 'Check for Updates' })).toBeVisible()

    await page.getByRole('tab', { name: 'About' }).click()
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
    await expect(page.locator('#rw-about-version')).toHaveText(/1\.8\.2-beta/)
    await expect(page.locator('#rw-about-build-date')).not.toHaveText('')
    await expect(page.locator('#rw-about-platform')).not.toHaveText('')
    await expect(page.locator('#rw-about-channel')).toHaveText(/stable|beta|alpha/)
    await expect(page.getByRole('button', { name: 'Copy Version Info' })).toBeVisible()
  })
})

test('updater: failed update check is non-blocking and does not hide the agent thread', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await ensureProjectContext(page)

    await page.route('**/latest.json', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'simulated-update-failure' }) })
    )

    await page.evaluate(async () => {
      const updateState = await window.rina?.updateState?.()
      if (!updateState) return
      if (typeof window.rina?.checkForUpdate !== 'function') return
      await window.rina.checkForUpdate()
    })

    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: 'RinaWarp Terminal Pro' }).first()).toBeVisible()
    await expect(page.locator('#agent-input')).toBeVisible()
  })
})

test('updater: receipt and run history survive app reload (simulated version boundary)', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.rina?.workspaceDefault === 'function')
    await ensureProjectContext(page)

    const seededRunId = 'updater-version-bump-run'
    const now = new Date().toISOString()
    await page.evaluate(
      ({ runId, now }) => {
        const bridge = (window as any).__rinaE2EWorkbench
        if (!bridge) throw new Error('E2E workbench bridge unavailable')
        bridge.dispatch({
          type: 'runs/upsert',
          run: {
            id: runId,
            sessionId: `updater-${runId}`,
            title: 'Version bump preflight',
            command: 'pwd',
            cwd: '/tmp/rinawarp-e2e-project',
            status: 'ok',
            startedAt: now,
            updatedAt: now,
            endedAt: now,
            exitCode: 0,
            commandCount: 1,
            failedCount: 0,
            latestReceiptId: `receipt-${runId}`,
            restored: true,
          },
        })
      },
      { runId: seededRunId, now }
    )

    await page.reload()
    await page.waitForFunction(() => typeof window.rina?.updateState === 'function')

    const historyButton = page.locator('[data-shell-source="shell_topbar"][data-shell-nav="runs"]')
    await expect(historyButton).toBeVisible()
    await historyButton.click()
    await expect(page.locator('.rw-inline-runblock')).toHaveCount(1)
  })
})
})

test('updater: failed update check is non-blocking and does not hide the agent thread', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === 'function')
    await ensureProjectContext(page)

    await page.route('**/latest.json', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'simulated-update-failure' }) })
    )

    await page.evaluate(async () => {
      const updateState = await window.rina?.updateState?.()
      if (!updateState) return
      if (typeof window.rina?.checkForUpdate !== 'function') return
      await window.rina.checkForUpdate()
    })

    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: 'RinaWarp Terminal Pro' }).first()).toBeVisible()
    await expect(page.locator('#agent-input')).toBeVisible()
  })
})

test('updater: receipt and run history survive a simulated version bump', async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.rina?.updateState === 'function')
    await ensureProjectContext(page)

    const seededRunId = 'updater-version-bump-run'
    const now = new Date().toISOString()
    await page.evaluate(
      ({ runId, now }) => {
        const bridge = (window as any).__rinaE2EWorkbench
        if (!bridge) throw new Error('E2E workbench bridge unavailable')
        bridge.dispatch({
          type: 'runs/upsert',
          run: {
            id: runId,
            sessionId: `updater-${runId}`,
            title: 'Version bump preflight',
            command: 'pwd',
            cwd: '/tmp/rinawarp-e2e-project',
            status: 'ok',
            startedAt: now,
            updatedAt: now,
            endedAt: now,
            exitCode: 0,
            commandCount: 1,
            failedCount: 0,
            latestReceiptId: `receipt-${runId}`,
            restored: true,
          },
        })
      },
      { runId: seededRunId, now }
    )

    await page.evaluate(async () => {
      await window.rina?.revealRunReceipt?.(`receipt-${seededRunId}`)
    })
    await page.waitForTimeout(200)

    await page.evaluate(() => {
      const bridge = (window as any).__rinaE2EWorkbench
      if (!bridge) return
      bridge.dispatch({ type: 'storage/simulateVersionBump', targetVersion: '99.0.0-test' })
      bridge.dispatch({ type: 'runs/restore', runs: [] })
    })

    await page.reload()
    await page.waitForFunction(() => typeof window.rina?.updateState === 'function')

    const historyLabel = page.locator('[data-shell-source="shell_topbar"][data-shell-nav="runs"]')
    await expect(historyLabel).toBeVisible()
    await historyLabel.click()
    await expect(page.locator('.rw-inline-runblock')).toHaveCount(1)

    const receiptButton = page.getByRole('button', { name: /Show receipts|Receipt/i }).first()
    if (await receiptButton.count() === 0) {
      await page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]').click()
    } else {
      await receiptButton.click()
    }
    await expect(page.locator('#receipt-output')).toContainText('Version bump preflight')
  })
})
