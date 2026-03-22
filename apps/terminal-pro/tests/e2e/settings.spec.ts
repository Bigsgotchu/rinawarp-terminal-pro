import { test, expect } from "@playwright/test";
import { withApp } from "./_app";
import { modKey } from "./_helpers";

async function waitForSettingsReady(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__rinaSettings?.open === "function");
}

test("settings: CmdOrCtrl+, opens settings and Escape closes", async () => {
  await withApp(async ({ page }) => {
    const settings = page.locator("#rw-settings");
    await waitForSettingsReady(page);

    await expect(settings).toBeHidden();

    await page.bringToFront();
    await page.focus("body");
    await page.keyboard.press(modKey(","));

    await expect(settings).toBeVisible();
    await expect(settings).toHaveClass(/rw-settings-open/);

    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
  });
});

test("settings: tab selection persists across close and reopen", async () => {
  await withApp(async ({ page }) => {
    await waitForSettingsReady(page);
    await page.keyboard.press(modKey(","));
    await expect(page.locator("#rw-settings")).toBeVisible();

    await page.locator('#rw-settings [data-settings-tab="themes"]').click();
    await expect(page.locator('#rw-settings [role="tab"][aria-selected="true"]')).toHaveAttribute("data-settings-tab", "themes");

    const storedTab = await page.evaluate(() => localStorage.getItem("rinawarp.settings.activeTab.v1"));
    expect(storedTab).toBe("themes");

    await page.keyboard.press("Escape");
    await expect(page.locator("#rw-settings")).toBeHidden();

    await page.keyboard.press(modKey(","));
    await expect(page.locator("#rw-settings")).toBeVisible();
    await expect(page.locator('#rw-settings [role="tab"][aria-selected="true"]')).toHaveAttribute("data-settings-tab", "themes");
  });
});

test("settings: shortcut does not steal focus from external inputs", async () => {
  await withApp(async ({ page }) => {
    await waitForSettingsReady(page);
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "e2e-input";
      document.body.appendChild(input);
      input.focus();
    });

    await expect(page.locator("#e2e-input")).toBeFocused();
    await page.keyboard.press(modKey(","));
    await expect(page.locator("#rw-settings")).toBeHidden();

    await page.evaluate(() => document.getElementById("e2e-input")?.remove());
  });
});

test("settings: memory panel saves explicit owner and workspace preferences", async () => {
  await withApp(async ({ page }) => {
    await waitForSettingsReady(page);
    await page.keyboard.press(modKey(","));
    await expect(page.locator("#rw-settings")).toBeVisible();

    await page.locator('#rw-settings [data-settings-tab="memory"]').click();
    await expect(page.locator('#rw-settings [role="tab"][aria-selected="true"]')).toHaveAttribute("data-settings-tab", "memory");

    await page.locator("#rw-memory-preferred-name").fill("Karina");
    await page.locator("#rw-memory-tone").selectOption("concise");
    await page.locator("#rw-memory-humor").selectOption("high");
    await page.locator("#rw-memory-likes").fill("receipts first\nsharp summaries");
    await page.locator("#rw-memory-dislikes").fill("fake progress");
    await page.locator("#rw-memory-save-profile").click();
    await expect(page.locator("#rw-memory-feedback")).toHaveText("Owner profile memory saved.");

    await page.locator("#rw-memory-response-style").fill("show the short plan first");
    await page.locator("#rw-memory-proof-style").fill("keep run IDs visible");
    await page.locator("#rw-memory-conventions").fill("packageManager=npm");
    await page.locator("#rw-memory-save-workspace").click();
    await expect(page.locator("#rw-memory-feedback")).toHaveText("Workspace memory saved.");

    await page.keyboard.press("Escape");
    await expect(page.locator("#rw-settings")).toBeHidden();

    await page.keyboard.press(modKey(","));
    await page.locator('#rw-settings [data-settings-tab="memory"]').click();

    await expect(page.locator("#rw-memory-preferred-name")).toHaveValue("Karina");
    await expect(page.locator("#rw-memory-tone")).toHaveValue("concise");
    await expect(page.locator("#rw-memory-humor")).toHaveValue("high");
    await expect(page.locator("#rw-memory-likes")).toHaveValue(/receipts first/);
    await expect(page.locator("#rw-memory-response-style")).toHaveValue(/show the short plan first/);
    await expect(page.locator("#rw-memory-proof-style")).toHaveValue(/keep run IDs visible/);
    await expect(page.locator("#rw-memory-conventions")).toHaveValue(/packageManager=npm/);
  });
});
