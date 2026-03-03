import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("agent mode: submit creates a runnable plan block", async () => {
  await withApp(async ({ page }) => {
    await page.locator("#modeAgent").click();
    await expect(page.locator("#modeAgent")).toHaveClass(/active/);

    await page.locator("#intent").fill("Debug failing tests in this workspace");
    await page.locator("#intent").press("Enter");

    const planBlock = page.locator(".block.plan").last();
    await expect(planBlock).toBeVisible({ timeout: 15000 });
    await expect(planBlock).toContainText("Rina");
    await expect(planBlock).toContainText("Run plan");
  });
});

test("agent mode: session history records agent run label", async () => {
  await withApp(async ({ page }) => {
    await page.locator("#modeAgent").click();
    await page.locator("#intent").fill("Explain what this project does");
    await page.locator("#intent").press("Enter");

    await page.getByTestId("tab-sessions").click();
    await expect(page.getByTestId("panel-sessions")).toContainText("Agent:");
  });
});
