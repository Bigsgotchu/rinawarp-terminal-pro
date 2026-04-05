import { test, expect } from '@playwright/test';
import { withApp } from './_app';

test.describe('Demo: First Run', () => {
  test('launch app, greet Rina, open settings', async () => {
    await withApp(async ({ page }) => {
      const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Wait for app to initialize
      await pause(1500);

      // Find the input/chat field - typical selectors for RinaWarp
      const inputLocator = page.locator('input[placeholder*="Ask"], textarea, [contenteditable="true"]').first();
      
      // Try to find Rina's greeting or any welcome message
      await pause(1000);

      // Type a greeting
      await inputLocator.click();
      await pause(500);
      await inputLocator.fill('hello');
      await pause(500);
      await inputLocator.press('Enter');
      
      // Wait for response
      await pause(3000);

      // Open settings (usually Ctrl+, or via menu)
      await page.keyboard.press('Control+,');
      await pause(1500);

      // Take a screenshot for the demo
      await page.screenshot({ path: 'demo-first-run.png' });

      console.log('Demo first-run complete');
    });
  });
});
