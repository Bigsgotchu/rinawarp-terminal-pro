import { test, expect } from "@playwright/test";
import { withApp } from "./_app";
import { modKey } from "./_helpers";

test("settings: CmdOrCtrl+, opens overlay, Escape closes", async () => {
  await withApp(async ({ page }) => {
    // Settings should be hidden initially
    const settings = page.locator("#rw-settings");
    await expect(settings).toBeHidden();

    // Open with platform-appropriate keyboard shortcut
    await page.keyboard.press(modKey(","));
    
    // Settings should now be visible
    await expect(settings).toBeVisible();
    await expect(settings).toHaveAttribute("aria-hidden", "false");

    // Close with Escape
    await page.keyboard.press("Escape");
    
    // Settings should be hidden again
    await expect(settings).toBeHidden();
  });
});

test("settings: ArrowDown switches tab and updates localStorage", async () => {
  await withApp(async ({ page }) => {
    // Open settings
    await page.keyboard.press(modKey(","));
    
    const settings = page.locator("#rw-settings");
    await expect(settings).toBeVisible();

    // Verify only one active tab
    await expect(page.locator(".rw-tab-active")).toHaveCount(1);

    // Force known start tab
    await page.locator('#rw-settings [data-settings-tab="general"]').click();
    const activeTab = page.locator('#rw-settings [role="tab"][aria-selected="true"]');
    await expect(activeTab).toHaveAttribute("data-settings-tab", "general");

    // Press ArrowDown to switch to Themes
    await page.keyboard.press("ArrowDown");
    
    // Active tab should now be Themes
    await expect(activeTab).toHaveAttribute("data-settings-tab", "themes");

    // Verify localStorage was updated
    const storedTab = await page.evaluate(() => {
      return localStorage.getItem("rinawarp.settings.activeTab.v1");
    });
    expect(storedTab).toBe("themes");

    // Close settings
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();

    // Reopen and verify tab persisted
    await page.keyboard.press(modKey(","));
    await expect(settings).toBeVisible();
    await expect(activeTab).toHaveAttribute("data-settings-tab", "themes");
  });
});

// Shortcut contract tests

test("settings: does not steal Cmd/Ctrl+, from normal inputs", async () => {
  await withApp(async ({ page }) => {
    // Create an input in the renderer DOM (outside settings)
    await page.evaluate(() => {
      const i = document.createElement("input");
      i.id = "e2e-input";
      i.value = "typing";
      document.body.appendChild(i);
      i.focus();
    });

    await expect(page.locator("#e2e-input")).toBeFocused();

    // Press shortcut while focused on external input
    await page.keyboard.press(modKey(","));

    // Settings should NOT open because we're in an editable field outside dialog
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
    // Open settings
    await page.keyboard.press(modKey(","));
    const settings = page.locator("#rw-settings");
    await expect(settings).toBeVisible();

    // Inject an input inside settings to simulate typing
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

    await expect(page.locator("#e2e-settings-input")).toBeFocused();

    // Press Escape while focused on input inside settings
    await page.keyboard.press("Escape");

    // Settings should stay open because input was focused
    await expect(settings).toBeVisible();

    // Cleanup
    await page.evaluate(() => {
      document.getElementById("e2e-settings-input")?.remove();
    });
  });
});

test("settings: Cmd/Ctrl+, toggles (open then close)", async () => {
  await withApp(async ({ page }) => {
    const settings = page.locator("#rw-settings");

    // Open
    await page.keyboard.press(modKey(","));
    await expect(settings).toBeVisible();

    // Toggle close with same shortcut
    await page.keyboard.press(modKey(","));
    await expect(settings).toBeHidden();
  });
});

test("settings: Cmd/Ctrl+, works inside settings dialog to close", async () => {
  await withApp(async ({ page }) => {
    const settings = page.locator("#rw-settings");

    // Open
    await page.keyboard.press(modKey(","));
    await expect(settings).toBeVisible();

    // Focus something inside settings
    const activeTab = page.locator('#rw-settings [role="tab"][aria-selected="true"]');
    await activeTab.focus();

    // Press Cmd/Ctrl+, from inside settings - should close
    await page.keyboard.press(modKey(","));
    await expect(settings).toBeHidden();
  });
});

test("settings: focus trap wraps within dialog", async () => {
  await withApp(async ({ page }) => {
    // Open settings
    await page.keyboard.press(modKey(","));
    const settings = page.locator("#rw-settings");
    await expect(settings).toBeVisible();

    // Press Tab multiple times - focus should stay within settings
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
    }

    // Focus should still be inside settings
    const focused = await page.evaluate(() => document.activeElement?.closest("#rw-settings") !== null);
    expect(focused).toBe(true);

    // Close
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
  });
});
