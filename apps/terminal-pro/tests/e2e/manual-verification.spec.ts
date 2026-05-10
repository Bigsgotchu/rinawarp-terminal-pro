import { test, expect } from '@playwright/test';
import { withApp } from './_app';

test('manual verification: Rina chat UI and responses', async ({}) => {
  await withApp(async ({ page }) => {
    // Wait for the app to be ready
    await page.waitForSelector('#composerInput');

    // Verify first-run prompt card appears
    const firstRunCard = page.locator('.first-run-card');
    await expect(firstRunCard).toBeVisible();
    await expect(firstRunCard).toContainText('Talk to Rina');

    // Verify chat placeholder text
    const composer = page.locator('#composerInput');
    await expect(composer).toHaveAttribute('placeholder', 'Ask Rina to fix something…');

    // Verify header branding
    const header = page.locator('.app-title');
    await expect(header).toContainText('Rina — AI Terminal Assistant');

    // Verify terminal drawer label
    const terminalLabel = page.locator('.terminal-pane-label');
    await expect(terminalLabel).toContainText("Rina’s Terminal");

    // Verify terminal helper copy
    const terminalHelper = page.locator('.terminal-pane-helper');
    await expect(terminalHelper).toBeVisible();
    await expect(terminalHelper).toContainText('Commands Rina runs appear here for transparency.');

    // Capture initial state with first-run card
    await page.screenshot({ path: 'test-results/01-initial.png' });

    // Helper to ask Rina a question and capture response
    const askRina = async (question: string, screenshotPath: string) => {
      await page.fill('#composerInput', question);
      await page.press('#composerInput', 'Enter');
      // Wait for response to appear
      await page.waitForTimeout(3000);
      await page.screenshot({ path: screenshotPath });
    };

    // Question 1: Why is my disk full?
    await askRina('Why is my disk full?', 'test-results/02-disk-full.png');

    // Question 2: What is using port 3000?
    await askRina('What is using port 3000?', 'test-results/03-port-3000.png');

    // Question 3: My build is failing
    await askRina('My build is failing', 'test-results/04-build-failing.png');
  });
});
