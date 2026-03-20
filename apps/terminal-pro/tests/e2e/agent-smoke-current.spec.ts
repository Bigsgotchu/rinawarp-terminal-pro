import { expect, test } from '@playwright/test'
import { withApp } from './_app'

test('agent smoke: prompt chip adds new thread activity', async () => {
  await withApp(async ({ page }) => {
    const thread = page.locator('#agent-output')
    await expect(thread).toBeVisible()

    const beforeCount = await thread.locator('.rw-thread-message').count()

    await page.getByRole('button', { name: 'Build this project' }).click()

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

    expect(newMessages.join('\n')).toContain('Available commands:')
    expect(newMessages.join('\n')).not.toContain('Command failed: What can you do?')
  })
})

test('agent smoke: build prompt executes a real project command', async () => {
  await withApp(async ({ page }) => {
    const thread = page.locator('#agent-output .rw-thread-message')
    const beforeCount = await thread.count()

    await page.getByRole('button', { name: 'Build this project' }).click()

    await expect
      .poll(async () => {
        return await thread.count()
      }, { timeout: 20000 })
      .toBeGreaterThan(beforeCount)

    const newMessages = await thread.evaluateAll((nodes, previous) => {
      return nodes.slice(previous as number).map((node) => node.textContent?.trim() || '')
    }, beforeCount)

    const reply = newMessages.join('\n')
    expect(reply).toContain('I built the project and it completed successfully.')
    expect(reply).toContain('What happened')
    expect(newMessages.join('\n')).toContain('npm run build:electron')
    expect(newMessages.join('\n')).not.toContain("I don't know how to do that yet.")
    expect(newMessages.join('\n')).not.toContain('/bin/sh: 1: pnpm: not found')
  })
})
