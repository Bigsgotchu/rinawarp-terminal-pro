import { test, expect } from '@playwright/test';
import { withApp } from './_app';

test('first-run: example prompt button triggers disk diagnostic flow', async () => {
  await withApp(async ({ page }) => {
    // Ensure first-run card is visible
    await expect(page.locator('.first-run-card')).toBeVisible();

    // Click the first example button
    const firstButton = page.locator('.first-run-actions .suggestion-btn').first();
    await expect(firstButton).toContainText('Why is my disk full?');
    await firstButton.click();

    // Wait for assistant response with disk-related playbook
    await page.waitForTimeout(4000);

    // Check that a block containing disk playbook appears
    const lastAssistant = page.locator('.chat-row.rina .chat-bubble').last();
    await expect(lastAssistant).toContainText(/disk|space|full/i);
  });
});
