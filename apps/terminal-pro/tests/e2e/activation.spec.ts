import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("activation: 3-step flow records completion and first-success state", async () => {
  await withApp(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("rinawarp:activation:v1");
      (window as any).setSidebarTab?.("settings");
      (window as any).setSettingsTab?.("onboarding");
      (window as any).renderActivationChecklist?.();
    });

    const status = page.locator("#activationStatus");
    const steps = page.locator("#activationSteps");
    await expect(status).toContainText("0/3");

    await page.evaluate(() => {
      (window as any).markActivationStep?.("safe_command", { source: "e2e" });
      (window as any).markActivationStep?.("plan_run", { source: "e2e" });
      (window as any).markActivationStep?.("report_download", { source: "e2e" });
    });

    await expect(status).toContainText("Completed in");
    await expect(steps).toContainText("Run a safe command");
    await expect(steps).toContainText("Run a plan");
    await expect(steps).toContainText("Download a report");

    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("rinawarp:activation:v1") || "null"));
    expect(state?.steps?.safe_command).toBe(true);
    expect(state?.steps?.plan_run).toBe(true);
    expect(state?.steps?.report_download).toBe(true);
    expect(typeof state?.completedAt).toBe("number");
  });
});
