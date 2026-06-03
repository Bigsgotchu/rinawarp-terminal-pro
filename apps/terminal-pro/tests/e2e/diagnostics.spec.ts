import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { withApp } from "./_app";

function readStoredZipEntries(zipPath: string): Record<string, string> {
  const buffer = fs.readFileSync(zipPath)
  const entries: Record<string, string> = {}
  let offset = 0
  while (offset + 30 < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18)
    const fileNameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const nameStart = offset + 30
    const dataStart = nameStart + fileNameLength + extraLength
    const name = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8")
    entries[name] = buffer.subarray(dataStart, dataStart + compressedSize).toString("utf8")
    offset = dataStart + compressedSize
  }
  return entries
}

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

test("smoke: settings exports a redacted diagnostic bundle", async () => {
  await withApp(async ({ page }) => {
    await page.waitForFunction(() => typeof window.__rinaSettings?.open === "function");
    await page.evaluate(() => window.__rinaSettings?.open("diagnostics"));
    await expect(page.locator("#rw-settings")).toBeVisible();

    await expect(page.getByRole("button", { name: "Export diagnostic bundle" })).toBeVisible();
    await page.getByRole("button", { name: "Export diagnostic bundle" }).click();
    await expect(page.locator("#rw-diag-status")).toContainText(/^Saved:/, { timeout: 10_000 });

    const status = await page.locator("#rw-diag-status").textContent();
    const bundlePath = String(status || "").replace(/^Saved:\s*/, "").trim();
    expect(bundlePath).toBeTruthy();
    expect(fs.existsSync(bundlePath)).toBe(true);

    const entries = readStoredZipEntries(bundlePath);
    expect(Object.keys(entries).sort()).toEqual([
      "diagnostic-manifest.json",
      "sanitized-log-snippets.txt",
      "telemetry-counters.json",
    ]);
    const combined = Object.values(entries).join("\n");
    expect(combined).not.toContain("/home/karina");
    expect(combined).not.toMatch(/sk_live_|password=|private_key/i);
  });
});
