import { test, expect } from "@playwright/test";
import { withApp } from "./_app";
import { modKey } from "./_helpers";

test("palette: CmdOrCtrl+K opens quick actions and Escape closes", async () => {
  await withApp(async ({ page }) => {
    const palette = page.locator("#command-palette");
    const input = page.locator("#palette-input");

    await expect(palette).not.toHaveClass(/visible/);

    await page.bringToFront();
    await page.focus("body");
    await page.keyboard.press(modKey("k"));

    await expect(palette).toHaveClass(/visible/);
    await expect(input).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(palette).not.toHaveClass(/visible/);
  });
});

test("palette: filtering shows matching quick actions", async () => {
  await withApp(async ({ page }) => {
    const palette = page.locator("#command-palette");
    const input = page.locator("#palette-input");

    await page.keyboard.press(modKey("k"));
    await expect(palette).toHaveClass(/visible/);

    await input.fill("diagnostics");

    const items = page.locator(".palette-item");
    await expect(items.first()).toBeVisible();
    const texts = await items.allTextContents();
    expect(texts.some((text) => /diagnostics/i.test(text))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(palette).not.toHaveClass(/visible/);
  });
});

test("palette: shortcut does not steal focus from a text input", async () => {
  await withApp(async ({ page }) => {
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "e2e-input";
      document.body.appendChild(input);
      input.focus();
    });

    await page.keyboard.press(modKey("k"));

    await expect(page.locator("#command-palette")).not.toHaveClass(/visible/);
    await page.evaluate(() => document.getElementById("e2e-input")?.remove());
  });
});
