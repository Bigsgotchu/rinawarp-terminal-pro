import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("smoke: redaction preview catches tokens", async () => {
  await withApp(async ({ page }) => {
    const input = "token=ghp_abcdefghijklmnopqrstuvwxyzABCDE1234567890abcd";
    const out = await page.evaluate(async (text) => {
      const w = window as any;
      return w.rina.invoke("rina:redaction:preview", text);
    }, input);

    expect(out).toBeTruthy();
    expect(Number(out.redactionCount || 0)).toBeGreaterThan(0);
    expect(String(out.redactedText || "")).toContain("[REDACTED]");
    expect(Array.isArray(out.hits)).toBe(true);
  });
});
