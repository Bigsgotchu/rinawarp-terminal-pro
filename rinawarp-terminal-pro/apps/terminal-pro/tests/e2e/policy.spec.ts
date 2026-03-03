import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("smoke: policy explain blocks dangerous commands", async () => {
  await withApp(async ({ page }) => {
    const out = await page.evaluate(async () => {
      const w = window as any;
      return w.rina.invoke("rina:policy:explain", "rm -rf /tmp/rina_smoke_should_block");
    });

    expect(out).toBeTruthy();
    expect(["deny", "require_approval", "require_two_step"]).toContain(out.action);
    expect(typeof out.message).toBe("string");
  });
});
