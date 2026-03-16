import { test, expect, type Page } from "@playwright/test";
import { withApp } from "./_app";
import { modKey } from "./_helpers";

test("palette: CmdOrCtrl+K opens palette, Escape closes", async () => {
  await withApp(async ({ page }) => {
    await page.bringToFront();
    await page.focus("body");

    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeHidden();

    // Open palette
    await page.keyboard.press(modKey("k"));
    await page.waitForTimeout(50);
    await expect(backdrop).toBeVisible();
    await expect(backdrop).toHaveAttribute("aria-hidden", "false");

    const input = page.locator(".rw-palette-input");
    await expect(input).toBeFocused();

    // Close palette
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await expect(backdrop).toBeHidden();
  });
});

test("palette: ArrowDown/Up navigates items", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    await page.waitForTimeout(50);

    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();

    const firstItem = items.first();
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // ArrowDown
    await page.keyboard.press("ArrowDown");
    const secondItem = items.nth(1);
    await expect(secondItem).toHaveAttribute("aria-selected", "true");
    await expect(firstItem).toHaveAttribute("aria-selected", "false");

    // ArrowUp wraps back
    await page.keyboard.press("ArrowUp");
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await expect(backdrop).toBeHidden();
  });
});

test("palette: filter narrows results", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    await page.waitForTimeout(50);

    const backdrop = page.locator("#rw-palette-backdrop");
    const input = page.locator(".rw-palette-input");
    await expect(backdrop).toBeVisible();

    await input.fill("theme");
    await page.waitForTimeout(50);

    const items = page.locator(".rw-palette-item:visible");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    const texts = await items.allTextContents();
    expect(texts.some((t) => /theme/i.test(t))).toBeTruthy();

    await input.fill("");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await expect(backdrop).toBeHidden();
  });
});

test("palette: command mode (>) filters by route", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    await page.waitForTimeout(50);

    const backdrop = page.locator("#rw-palette-backdrop");
    const input = page.locator(".rw-palette-input");
    await expect(backdrop).toBeVisible();

    await input.fill(">theme");
    await page.waitForTimeout(50);

    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await expect(backdrop).toBeHidden();
  });
});

test("palette: arrow keys wrap at top/bottom", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    await page.waitForTimeout(50);

    const backdrop = page.locator("#rw-palette-backdrop");
    const items = page.locator(".rw-palette-item");
    await expect(backdrop).toBeVisible();
    await expect(items.first()).toBeVisible();

    const count = await items.count();
    expect(count).toBeGreaterThan(1);

    const firstItem = items.first();
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Wrap up to last
    await page.keyboard.press("ArrowUp");
    const lastItem = items.nth(count - 1);
    await expect(lastItem).toHaveAttribute("aria-selected", "true");

    // Wrap down to first
    await page.keyboard.press("ArrowDown");
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await expect(backdrop).toBeHidden();
  });
});

test("palette: does not steal Cmd/Ctrl+K from inputs", async () => {
  await withApp(async ({ page }) => {
    await page.evaluate(() => {
      const i = document.createElement("input");
      i.id = "e2e-input";
      document.body.appendChild(i);
      i.focus();
    });
    await page.keyboard.press(modKey("k"));

    await expect(page.locator("#rw-palette-backdrop")).toBeHidden();
    await page.evaluate(() => document.getElementById("e2e-input")?.remove());
  });
});

test("palette: Escape clears query first, then closes", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    const backdrop = page.locator("#rw-palette-backdrop");
    const input = page.locator(".rw-palette-input");

    await input.fill("abc");
    await page.keyboard.press("Escape");

    await expect(input).toHaveValue("");
    await expect(backdrop).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: Enter does not double-run on key repeat", async () => {
  await withApp(async ({ page }) => {
    await page.evaluate(() => {
      (window as any).RINAWARP_E2E = true;
      (window as any).__e2eExecCount = 0;
    });

    await page.keyboard.press(modKey("k"));
    const input = page.locator(".rw-palette-input");
    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    await input.fill("e2e increment");
    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();

    await page.keyboard.down("Enter");
    await page.waitForTimeout(200);
    await page.keyboard.up("Enter");
    await page.waitForTimeout(100);

    const count = await page.evaluate(() => (window as any).__e2eExecCount ?? 0);
    expect(count).toBe(1);

    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: focus trap wraps within dialog", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    const input = page.locator(".rw-palette-input");
    await expect(input).toBeFocused();

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    const focused = await page.evaluate(() =>
      document.activeElement?.closest("#rw-palette-backdrop") !== null
    );
    expect(focused).toBe(true);

    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: Cmd/Ctrl+K toggles (closes when open)", async () => {
  await withApp(async ({ page }) => {
    const backdrop = page.locator("#rw-palette-backdrop");

    await page.keyboard.press(modKey("k"));
    await expect(backdrop).toBeVisible();

    await page.keyboard.press(modKey("k"));
    await expect(backdrop).toBeHidden();
  });
});
