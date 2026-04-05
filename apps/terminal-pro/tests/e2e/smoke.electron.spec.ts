import { expect, test } from "@playwright/test";
import { waitForAppReady, waitForFirstWindow } from "./_app";
import { modKey } from "./_helpers";
import { launchApp } from "./_launch";

test.setTimeout(120_000);

function agentTopbarTab(page: import("@playwright/test").Page) {
  return page.locator('[data-shell-source="shell_topbar"][data-shell-nav="agent"]');
}

test("smoke: agent home + settings persistence", async () => {
  const sharedUserData = `smoke-settings-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const app = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: sharedUserData,
  });

  let persistedAccent = "";
  let persistedDensity = "";

  try {
    const page = await waitForFirstWindow(app);
    await page.waitForLoadState("domcontentloaded");
    await waitForAppReady(page);

    await expect(page.locator("#panel-agent")).toBeVisible();
    await expect(page.locator(".rw-agent-welcome-card")).toBeVisible();
    await expect(page.locator(".rw-agent-welcome-card")).toContainText(
      /Fix your broken project automatically\.|Open a project and click Fix Project|This folder may not be the project root yet/i,
    );
    const welcomeCard = page.locator(".rw-agent-welcome-card");
    await expect(welcomeCard.getByRole('button', { name: 'Open Project' })).toBeVisible();
    await expect(welcomeCard.getByRole('button', { name: 'Try Demo Project' })).toBeVisible();

    await page.waitForFunction(() => typeof window.__rinaSettings?.open === "function");
    await page.keyboard.press(modKey(","));
    await expect(page.locator("#rw-settings")).toBeVisible();
    await expect(page.locator("#rw-settings")).toHaveClass(/rw-settings-open/);

    await page.locator('[data-settings-tab="themes"]').click();
    await expect(page.locator("#rw-theme-list")).toBeVisible();
    const targetThemeId = await page.evaluate(async () => {
      const selected = await window.rina.themesGet();
      const registry = await window.rina.themesList();
      return registry.themes.find((theme: { id: string }) => theme.id !== selected.id)?.id || selected.id;
    });
    await expect(page.locator(`[data-theme-id="${targetThemeId}"]`)).toBeVisible();
    await page.locator(`[data-theme-id="${targetThemeId}"]`).click();

    persistedAccent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--rw-accent").trim(),
    );
    expect(persistedAccent.length).toBeGreaterThan(0);

    await page.locator('[data-settings-tab="general"]').click();
    await page.locator('[data-density-option="compact"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
    persistedDensity = "compact";

    await page.keyboard.press("Escape");
    await expect(page.locator("#rw-settings")).not.toBeVisible();
    await agentTopbarTab(page).click();
    await expect(page.locator("#panel-agent")).toBeVisible();
  } finally {
    await app.close();
  }

  const app2 = await launchApp({
    RINAWARP_E2E_USER_DATA_SUFFIX: sharedUserData,
  });

  try {
    const page = await waitForFirstWindow(app2);
    await page.waitForLoadState("domcontentloaded");
    await waitForAppReady(page);

    await expect(page.locator("#panel-agent")).toBeVisible();

    const accent2 = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--rw-accent").trim(),
    );
    const density2 = await page.evaluate(() =>
      document.documentElement.getAttribute("data-density"),
    );

    expect(accent2).toBe(persistedAccent);
    expect(density2).toBe(persistedDensity);
  } finally {
    await app2.close();
  }
});
