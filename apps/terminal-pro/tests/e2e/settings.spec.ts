import { test, expect, type Page } from "@playwright/test";
import { withApp } from "./_app";
import { modKey } from "./_helpers";

test("settings: CmdOrCtrl+, opens overlay, Escape closes", async () => {
  await withApp(async ({ page }) => {
    await page.bringToFront();
    await page.focus("body");

    const settings = page.locator("#rw-settings");
    await expect(settings).toBeHidden();

    // Open settings
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);
    await expect(settings).toBeVisible();

    // Close settings
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await expect(settings).toBeHidden();
  });
});

test("settings: ArrowDown switches tab and updates localStorage", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);

    const settings = page.locator("#rw-settings");
    await expect(settings).toBeVisible();

    // Force known start tab
    const generalTab = page.locator('#rw-settings [data-settings-tab="general"]');
    await generalTab.click();
    await page.waitForTimeout(50);

    // Verify active tab
    let activeTab = page.locator('#rw-settings [role="tab"][aria-selected="true"]');
    await expect(activeTab).toHaveAttribute("data-settings-tab", "general");

    // Press ArrowDown to switch tab
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(50);

    // Re-query after tab change
    activeTab = page.locator('#rw-settings [role="tab"][aria-selected="true"]');
    await expect(activeTab).toHaveAttribute("data-settings-tab", "themes");

    // Check localStorage
    const storedTab = await page.evaluate(() =>
      localStorage.getItem("rinawarp.settings.activeTab.v1")
    );
    expect(storedTab).toBe("themes");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);

    // Reopen and verify persistence
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);
    activeTab = page.locator('#rw-settings [role="tab"][aria-selected="true"]');
    await expect(activeTab).toHaveAttribute("data-settings-tab", "themes");

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
  });
});

test("settings: does not steal Cmd/Ctrl+, from normal inputs", async () => {
  await withApp(async ({ page }) => {
    // Create external input
    await page.evaluate(() => {
      const i = document.createElement("input");
      i.id = "e2e-input";
      i.value = "typing";
      document.body.appendChild(i);
      i.focus();
    });
    await expect(page.locator("#e2e-input")).toBeFocused();

    // Shortcut should NOT open settings
    await page.keyboard.press(modKey(","));
    const settings = page.locator("#rw-settings");
    await expect(settings).toBeHidden();

    // Cleanup
    await page.evaluate(() => {
      document.getElementById("e2e-input")?.remove();
    });
  });
});

test("settings: Escape does not close if input is focused inside dialog", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);

    // Inject input inside settings
    await page.evaluate(() => {
      const host = document.querySelector("#rw-settings");
      if (host) {
        const i = document.createElement("input");
        i.id = "e2e-settings-input";
        i.value = "test";
        host.appendChild(i);
        i.focus();
      }
    });

    const input = page.locator("#e2e-settings-input");
    await expect(input).toBeFocused();

    // Press Escape should NOT close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    const settings = page.locator("#rw-settings");
    await expect(settings).toBeVisible();

    // Cleanup
    await page.evaluate(() => {
      document.getElementById("e2e-settings-input")?.remove();
    });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
  });
});

test("settings: Cmd/Ctrl+, toggles (open then close)", async () => {
  await withApp(async ({ page }) => {
    await page.bringToFront();
    await page.focus("body");

    const settings = page.locator("#rw-settings");

    // Open
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);
    await expect(settings).toBeVisible();

    // Toggle close
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);
    await expect(settings).toBeHidden();
  });
});

test("settings: Cmd/Ctrl+, works inside settings dialog to close", async () => {
  await withApp(async ({ page }) => {
    const settings = page.locator("#rw-settings");

    // Open
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);
    await expect(settings).toBeVisible();

    // Focus something inside settings
    const activeTab = page.locator('#rw-settings [role="tab"][aria-selected="true"]');
    await activeTab.focus();

    // Press shortcut from inside should close
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);
    await expect(settings).toBeHidden();
  });
});

test("settings: focus trap wraps within dialog", async () => {
  await withApp(async ({ page }) => {
    await page.keyboard.press(modKey(","));
    await page.waitForTimeout(50);

    // Press Tab multiple times - focus should remain inside settings
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    const focused = await page.evaluate(() =>
      document.activeElement?.closest("#rw-settings") !== null
    );
    expect(focused).toBe(true);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
  });
});
