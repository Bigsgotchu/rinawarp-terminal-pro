import { test, expect } from '@playwright/test';
import { withApp } from './_app';

test.describe('Demo: Build Flow', () => {
  test('show a build in action', async () => {
    await withApp(async ({ page }) => {
      const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Wait for app to initialize
      await pause(1500);

      // Find the input/chat field
      const inputLocator = page.locator('input[placeholder*="Ask"], textarea, [contenteditable="true"]').first();

      // Ask to build something
      await inputLocator.click();
      await pause(500);
      await inputLocator.fill('build this project');
      await pause(500);
      await inputLocator.press('Enter');

      // Wait for build to start and run block to appear
      await pause(5000);

      // Screenshot showing the build flow
      await page.screenshot({ path: 'demo-build-flow.png' });

      console.log('Demo build-flow complete');
    });
  });
});
