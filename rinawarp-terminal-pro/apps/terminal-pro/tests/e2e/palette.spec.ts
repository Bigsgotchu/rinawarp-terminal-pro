import { test, expect } from "@playwright/test";
import { withApp } from "./_app";
import { modKey } from "./_helpers";

test("palette: CmdOrCtrl+K opens palette, Escape closes", async () => {
  await withApp(async ({ page }) => {
    // Palette should be hidden initially
    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeHidden();

    // Open with platform-appropriate keyboard shortcut
    await page.keyboard.press(modKey("k"));

    // Palette should now be visible
    await expect(backdrop).toBeVisible();
    await expect(backdrop).toHaveAttribute("aria-hidden", "false");

    // Input should be focused
    const input = page.locator(".rw-palette-input");
    await expect(input).toBeFocused();

    // Close with Escape
    await page.keyboard.press("Escape");

    // Palette should be hidden again
    await expect(backdrop).toBeHidden();
  });
});

test("palette: ArrowDown/Up navigates items", async () => {
  await withApp(async ({ page }) => {
    // Open palette
    await page.keyboard.press(modKey("k"));

    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    // Wait for items to load
    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();

    // First item should be selected initially
    const firstItem = items.first();
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Press ArrowDown to move to second item
    await page.keyboard.press("ArrowDown");
    const secondItem = items.nth(1);
    await expect(secondItem).toHaveAttribute("aria-selected", "true");
    await expect(firstItem).toHaveAttribute("aria-selected", "false");

    // Press ArrowUp to go back to first item
    await page.keyboard.press("ArrowUp");
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Close without executing
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: filter narrows results", async () => {
  await withApp(async ({ page }) => {
    // Open palette
    await page.keyboard.press(modKey("k"));

    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    // Type to filter
    const input = page.locator(".rw-palette-input");
    await input.fill("theme");

    // Wait for filter to apply
    const items = page.locator(".rw-palette-item:visible");
    const count = await items.count();

    // All visible items should contain "theme" in some form
    expect(count).toBeGreaterThan(0);

    // Verify filtered items contain theme text
    const texts = await items.allTextContents();
    expect(texts.some((t) => /theme/i.test(t))).toBeTruthy();

    // Clear filter
    await input.fill("");
    await expect(items.first()).toBeVisible();

    // Close
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: command mode (>) filters by route", async () => {
  await withApp(async ({ page }) => {
    // Open palette
    await page.keyboard.press(modKey("k"));

    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    // Type command mode prefix
    const input = page.locator(".rw-palette-input");
    await input.fill(">theme");

    // Wait for filter to apply
    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();

    // Should show theme-related commands
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // Close
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: arrow keys wrap at top/bottom", async () => {
  await withApp(async ({ page }) => {
    // Open palette
    await page.keyboard.press(modKey("k"));

    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    // Wait for items to load
    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(1);

    // First item should be selected initially
    const firstItem = items.first();
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Press ArrowUp to wrap to last item
    await page.keyboard.press("ArrowUp");
    const lastItem = items.nth(count - 1);
    await expect(lastItem).toHaveAttribute("aria-selected", "true");

    // Press ArrowDown to wrap back to first item
    await page.keyboard.press("ArrowDown");
    await expect(firstItem).toHaveAttribute("aria-selected", "true");

    // Close
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

// Shortcut contract tests

test("palette: does not steal Cmd/Ctrl+K from normal inputs", async () => {
  await withApp(async ({ page }) => {
    // Create an input in the renderer DOM
    await page.evaluate(() => {
      const i = document.createElement("input");
      i.id = "e2e-input";
      i.value = "typing";
      document.body.appendChild(i);
      i.focus();
    });

    await expect(page.locator("#e2e-input")).toBeFocused();

    // Press shortcut while focused on external input
    await page.keyboard.press(modKey("k"));

    // Palette should NOT open because we're in an editable field
    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeHidden();

    // Cleanup
    await page.evaluate(() => {
      document.getElementById("e2e-input")?.remove();
    });
  });
});

test("palette: does not steal from textarea and contenteditable", async () => {
  await withApp(async ({ page }) => {
    // Test textarea
    await page.evaluate(() => {
      const ta = document.createElement("textarea");
      ta.id = "e2e-textarea";
      ta.value = "typing in textarea";
      document.body.appendChild(ta);
      ta.focus();
    });

    await expect(page.locator("#e2e-textarea")).toBeFocused();
    await page.keyboard.press(modKey("k"));
    await expect(page.locator("#rw-palette-backdrop")).toBeHidden();

    // Test contenteditable
    await page.evaluate(() => {
      document.getElementById("e2e-textarea")?.remove();
      const ce = document.createElement("div");
      ce.id = "e2e-contenteditable";
      ce.contentEditable = "true";
      ce.textContent = "typing in contenteditable";
      document.body.appendChild(ce);
      ce.focus();
    });

    await expect(page.locator("#e2e-contenteditable")).toBeFocused();
    await page.keyboard.press(modKey("k"));
    await expect(page.locator("#rw-palette-backdrop")).toBeHidden();

    // Cleanup
    await page.evaluate(() => {
      document.getElementById("e2e-contenteditable")?.remove();
    });
  });
});

test("palette: Escape clears query first, then closes", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey("k"));
    const input = page.locator(".rw-palette-input");
    await input.fill("abc");

    const backdrop = page.locator("#rw-palette-backdrop");

    // First Escape clears query
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("");
    await expect(backdrop).toBeVisible(); // still open

    // Second Escape closes
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: Enter does not double-run on key repeat", async () => {
  await withApp(async ({ page }) => {
    // Enable E2E mode and reset counter
    await page.evaluate(() => {
      (window as any).RINAWARP_E2E = true;
      (window as any).__e2eExecCount = 0;
    });

    // Open palette
    await page.keyboard.press(modKey("k"));
    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    // Filter to find the E2E command
    const input = page.locator(".rw-palette-input");
    await input.fill("e2e increment");

    // Wait for the command to appear
    const items = page.locator(".rw-palette-item");
    await expect(items.first()).toBeVisible();

    // Press and hold Enter (simulates key repeat)
    await page.keyboard.down("Enter");
    await page.waitForTimeout(200); // Hold for 200ms
    await page.keyboard.up("Enter");

    // Wait for command to execute
    await page.waitForTimeout(100);

    // Verify counter incremented exactly once
    const count = await page.evaluate(() => (window as any).__e2eExecCount ?? 0);
    expect(count).toBe(1);

    // Close palette
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: focus trap wraps within dialog", async () => {
  await withApp(async ({ page }) => {
    // Open palette
    await page.keyboard.press(modKey("k"));
    const backdrop = page.locator("#rw-palette-backdrop");
    await expect(backdrop).toBeVisible();

    // Get all focusable elements
    const input = page.locator(".rw-palette-input");
    await expect(input).toBeFocused();

    // Press Tab multiple times - focus should stay within palette
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    // Focus should still be inside the palette
    const focused = await page.evaluate(() => document.activeElement?.closest("#rw-palette-backdrop") !== null);
    expect(focused).toBe(true);

    // Close
    await page.keyboard.press("Escape");
    await expect(backdrop).toBeHidden();
  });
});

test("palette: Cmd/Ctrl+K toggles (closes when open)", async () => {
  await withApp(async ({ page }) => {
    const backdrop = page.locator("#rw-palette-backdrop");

    // Open
    await page.keyboard.press(modKey("k"));
    await expect(backdrop).toBeVisible();

    // Toggle close with same shortcut
    await page.keyboard.press(modKey("k"));
    await expect(backdrop).toBeHidden();
  });
});
