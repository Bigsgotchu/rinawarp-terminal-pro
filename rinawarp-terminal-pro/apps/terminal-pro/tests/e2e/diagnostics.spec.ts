import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { withApp } from "./_app";

test("smoke: diagnostics paths returns expected fields", async () => {
  await withApp(async ({ page }) => {
    const d = await page.evaluate(async () => {
      const w = window as any;
      return w.rina.invoke
        ? w.rina.invoke("rina:diagnostics:paths")
        : w.rina.diagnosticsPaths();
    });

    expect(d).toBeTruthy();
    expect(typeof d.app?.isPackaged).toBe("boolean");
    expect(typeof d.app?.appPath).toBe("string");
    expect(typeof d.app?.resourcesPath).toBe("string");

    expect(d.resolved?.renderer?.path).toBeTruthy();
    expect(typeof d.resolved?.renderer?.exists).toBe("boolean");

    expect(d.resolved?.policyYaml?.path).toBeTruthy();
    expect(typeof d.resolved?.policyYaml?.exists).toBe("boolean");
  });
});

test("smoke: support bundle writes a zip file", async () => {
  await withApp(async ({ page }) => {
    const out = await page.evaluate(async () => {
      const w = window as any;
      if (w?.rina?.supportBundle) return w.rina.supportBundle();
      return w?.rina?.invoke?.("rina:support:bundle");
    });

    expect(out?.ok).toBe(true);
    expect(typeof out?.path).toBe("string");
    expect(Number(out?.bytes || 0)).toBeGreaterThan(0);
    expect(fs.existsSync(out.path)).toBe(true);
    expect(fs.statSync(out.path).size).toBeGreaterThan(0);
  });
});
