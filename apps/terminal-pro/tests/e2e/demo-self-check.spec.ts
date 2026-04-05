import { test, expect } from '@playwright/test';
import { withApp } from './_app';

test.describe('Demo: Self Check', () => {
  test('scan the system and show capabilities', async () => {
    await withApp(async ({ page }) => {
      const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Wait for app to initialize
      await pause(1500);

      // Find the input/chat field
      const inputLocator = page.locator('input[placeholder*="Ask"], textarea, [contenteditable="true"]').first();

      // Ask "what can you do"
      await inputLocator.click();
      await pause(500);
      await inputLocator.fill('what can you do');
      await pause(500);
      await inputLocator.press('Enter');

      // Wait for response to populate
      await pause(4000);

      // Screenshot showing Rina's capabilities
      await page.screenshot({ path: 'demo-self-check.png' });

      console.log('Demo self-check complete');
    });
  });
});
