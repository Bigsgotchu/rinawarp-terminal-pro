import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("smoke: stop and force kill clear running state", async () => {
  await withApp(async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept("YES"));

    await page.getByTestId("tab-settings").click();
    await expect(page.getByTestId("panel-settings")).toBeVisible();

    await page.getByTestId("settings-tab-safety").click();
    await expect(page.getByTestId("qa-panel")).toBeVisible();

    await page.getByTestId("qa-start-long-run").click();
    await expect(page.getByTestId("stream-running")).toBeVisible({ timeout: 20_000 });

    await page.locator("[data-testid='stop-stream']:not([disabled])").first().click();
    await expect(page.getByTestId("stream-running")).toBeHidden({ timeout: 10_000 });

    await page.getByTestId("qa-start-long-run").click();
    await expect(page.getByTestId("stream-running")).toBeVisible({ timeout: 20_000 });

    await page.locator("[data-testid='kill-stream']:not([disabled])").first().click();
    await expect(page.getByTestId("stream-running")).toBeHidden({ timeout: 10_000 });
  });
});
