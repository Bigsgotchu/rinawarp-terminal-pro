import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("smoke: tabs + theme persistence", async () => {
  const accent = await withApp(async ({ page }) => {
    await page.getByTestId("tab-settings").click();
    await expect(page.getByTestId("panel-settings")).toBeVisible();

    await page.getByTestId("tab-structured").click();
    await expect(page.getByTestId("panel-structured")).toBeVisible();

    await page.getByTestId("tab-settings").click();
    await page.getByTestId("settings-tab-appearance").click();
    await page.getByTestId("theme-unicorn").click();

    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--rw-accent").trim(),
    );
    expect(value.length).toBeGreaterThan(0);
    return value;
  });

  await withApp(async ({ page }) => {
    const accent2 = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--rw-accent").trim(),
    );
    expect(accent2).toBe(accent);
  });
});
