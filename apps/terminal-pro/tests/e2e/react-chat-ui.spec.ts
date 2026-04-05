import { test, expect } from '@playwright/test'
import { withApp } from './_app'

test.describe('React Chat UI', () => {
  test('chat interface loads with premium design', async () => {
    await withApp(async ({ page }) => {
      // Wait for the app to be ready
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000) // Give React more time to render

      // Check if React root has content
      const rootContent = await page.locator('#root').innerHTML()
      expect(rootContent.length).toBeGreaterThan(0)

      // Verify the main chat container with gradient background
      const chatContainer = page.locator('div.bg-gradient-to-br')
      await expect(chatContainer).toBeVisible()

      // Verify enhanced header with logo and branding
      const headerBar = page.locator('div.border-b.border-zinc-800\\/50')
      await expect(headerBar).toBeVisible()
      await expect(headerBar).toContainText('Rina Terminal Pro')
      await expect(headerBar).toContainText('AI-Powered Development Assistant')

      // Verify input field with improved styling
      const inputField = page.locator('input[placeholder="Ask Rina anything..."]')
      await expect(inputField).toBeVisible()
      await expect(inputField).toBeEnabled()

      // Check for status indicator
      const statusIndicator = page.locator('div.w-2.h-2.bg-green-500')
      await expect(statusIndicator).toBeVisible()
    })
  })

  test('can type in enhanced input field', async () => {
    await withApp(async ({ page }) => {
      await page.waitForTimeout(3000)

      const inputField = page.locator('input[placeholder="Ask Rina anything..."]')
      const testMessage = 'Hello Rina, this is a test message with the new UI'

      // Type in the input field
      await inputField.fill(testMessage)
      await expect(inputField).toHaveValue(testMessage)

      // Check if send button appears
      const sendButton = page.locator('button.absolute.right-3')
      await expect(sendButton).toBeVisible()
    })
  })

  test('recovery card displays with premium styling', async () => {
    await withApp(async ({ page }) => {
      await page.waitForTimeout(3000)

      // Check for enhanced recovery card with gradient background
      const recoveryCard = page.locator('div.bg-gradient-to-r.from-blue-900\\/20')
      await expect(recoveryCard).toBeVisible()

      // Verify improved buttons
      const resumeButton = recoveryCard.locator('button').filter({ hasText: 'Resume Fix' })
      const detailsButton = recoveryCard.locator('button').filter({ hasText: 'View Details' })

      await expect(resumeButton).toBeVisible()
      await expect(detailsButton).toBeVisible()

      // Check for icon in recovery card
      const icon = recoveryCard.locator('svg')
      await expect(icon).toBeVisible()
    })
  })

  test('details drawer opens with enhanced content', async () => {
    await withApp(async ({ page }) => {
      await page.waitForTimeout(3000)

      // Find and click the View Details button
      const detailsButton = page.locator('button').filter({ hasText: 'View Details' }).first()
      await expect(detailsButton).toBeVisible()
      await detailsButton.click()

      // Check if enhanced details drawer appears
      const detailsDrawer = page.locator('div.fixed.right-0.top-0.h-full.w-80.bg-zinc-900\\/95')
      await expect(detailsDrawer).toBeVisible()
      await expect(detailsDrawer).toContainText('Session Details')

      // Verify drawer has structured content
      const summarySection = detailsDrawer.locator('div.bg-zinc-800\\/50').first()
      await expect(summarySection).toContainText('Recovery Summary')
    })
  })

  test('message bubbles display with improved styling', async () => {
    await withApp(async ({ page }) => {
      await page.waitForTimeout(3000)

      // Check for Rina's message bubble with improved styling
      const rinaMessage = page.locator('div.bg-zinc-800\\/80.border').first()
      await expect(rinaMessage).toBeVisible()
      await expect(rinaMessage).toContainText('I recovered your last session')

      // Verify message has timestamp
      const timestamp = rinaMessage.locator('div.text-xs.mt-2')
      await expect(timestamp).toBeVisible()
    })
  })
})
