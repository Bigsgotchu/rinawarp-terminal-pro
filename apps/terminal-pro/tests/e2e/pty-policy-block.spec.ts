import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("smoke: policy blocks interactive PTY submit", async () => {
  await withApp(async ({ page }) => {
    const command = "rm -rf /tmp/rina_e2e_policy_block_probe";
    const policy = await page.evaluate(async (cmd) => {
      const w = window as any;
      return w.rina.invoke("rina:policy:explain", cmd);
    }, command);

    // If policy explicitly allows this command in a custom local setup, no block assertion is possible.
    if (policy?.action === "allow") {
      return;
    }

    const token = `pty_policy_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    let ptyStarted = false;
    try {
      await page.evaluate(async ({ t }) => {
        const w = window as any;
        w.__e2eEvents = w.__e2eEvents || {};
        w.__e2eEvents[t] = { pty: [] as string[] };
        const unsubs: Array<() => void> = [];
        unsubs.push(
          w.rina.on("rina:pty:data", (payload: unknown) => {
            w.__e2eEvents[t].pty.push(String(payload || ""));
          }),
        );
        w.__e2eEvents[`${t}_unsubs`] = unsubs;
      }, { t: token });

      const startRes = await page.evaluate(async () => {
        const w = window as any;
        return w.rina.ptyStart({ cols: 120, rows: 30 });
      });
      if (!startRes?.ok && /node-pty is not installed/i.test(String(startRes?.error || ""))) {
        return;
      }
      expect(startRes?.ok).toBe(true);
      ptyStarted = true;

      // Give shell a prompt cycle to reduce timing flakes before submit.
      await page.evaluate(async () => {
        const w = window as any;
        await w.rina.ptyWrite("\n");
      });

      await expect
        .poll(
          async () =>
            page.evaluate((t) => {
              const w = window as any;
              const chunks: string[] = w.__e2eEvents?.[t]?.pty || [];
              return chunks.length > 0;
            }, token),
          { timeout: 5000 },
        )
        .toBe(true);

      await page.evaluate(async ({ cmd }) => {
        const w = window as any;
        await w.rina.ptyWrite(`${cmd}\n`);
      }, { cmd: command });

      await expect
        .poll(
          async () =>
            page.evaluate((t) => {
              const w = window as any;
              const chunks: string[] = w.__e2eEvents?.[t]?.pty || [];
              const all = chunks.join("");
              return (
                all.includes("[policy] blocked interactive command:") &&
                all.includes("Use Run/Plan execution so approvals can be recorded.")
              );
            }, token),
          { timeout: 15000 },
        )
        .toBe(true);
    } finally {
      await page.evaluate(async ({ t, stop }) => {
        const w = window as any;
        const unsubs = w.__e2eEvents?.[`${t}_unsubs`] || [];
        for (const fn of unsubs) {
          if (typeof fn === "function") fn();
        }
        delete w.__e2eEvents?.[`${t}_unsubs`];
        delete w.__e2eEvents?.[t];
        if (stop) {
          try {
            await w.rina.ptyStop();
          } catch {
            // no-op
          }
        }
      }, { t: token, stop: ptyStarted });
    }
  });
});
