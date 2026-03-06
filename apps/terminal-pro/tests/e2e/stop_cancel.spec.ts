import { test, expect } from "@playwright/test";
import { withApp } from "./_app";

test("smoke: cancel path handles running or early-end streams", async () => {
  await withApp(async ({ page }) => {
    const cmd = process.platform === "win32" ? "ping 127.0.0.1 -n 30" : "sleep 30";
    const projectRoot = await page.evaluate(async () => {
      const w = window as any;
      const res = await w.rina.invoke("rina:workspace:default");
      return res?.path || ".";
    });

    const policy = await page.evaluate(async (command) => {
      const w = window as any;
      return w.rina.invoke("rina:policy:explain", command);
    }, cmd);

    if (policy?.action === "deny") {
      expect(policy.action).toBe("deny");
      return;
    }

    const confirmed = policy?.action === "allow" ? false : true;
    const confirmationText =
      policy?.approval === "typed_yes"
        ? "YES"
        : policy?.approval === "typed_phrase"
          ? String(policy?.typedPhrase || "YES")
          : "";

    const token = `cancel_probe_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    await page.evaluate(async (t) => {
      const w = window as any;
      w.__e2eEvents = w.__e2eEvents || {};
      w.__e2eEvents[t] = { chunks: [], ends: [] };
      const unsubs: Array<() => void> = [];
      unsubs.push(
        w.rina.on("rina:stream:chunk", (p: any) => {
          w.__e2eEvents[t].chunks.push(p);
        }),
      );
      unsubs.push(
        w.rina.on("rina:stream:end", (p: any) => {
          w.__e2eEvents[t].ends.push(p);
        }),
      );
      w.__e2eEvents[`${t}_unsubs`] = unsubs;
    }, token);

    const step = { id: "e2e_sleep", tool: "terminal", command: cmd, risk: "read" as const };
    const { streamId } = await page.evaluate(async ({ step, projectRoot, confirmed, confirmationText }) => {
      const w = window as any;
      return w.rina.invoke("rina:executeStepStream", step, confirmed, confirmationText, projectRoot);
    }, { step, projectRoot, confirmed, confirmationText });

    expect(typeof streamId).toBe("string");
    expect(streamId.length).toBeGreaterThan(5);

    const sawChunk = await expect
      .poll(
        async () =>
          page.evaluate(({ t, sid }) => {
            const w = window as any;
            const chunks = w.__e2eEvents?.[t]?.chunks || [];
            const ends = w.__e2eEvents?.[t]?.ends || [];
            if (ends.some((e: any) => e?.streamId === sid)) return "ended";
            if (chunks.some((c: any) => c?.streamId === sid)) return "chunked";
            return "pending";
          }, { t: token, sid: streamId }),
        { timeout: 10000 },
      )
      .not.toBe("pending")
      .then(async () =>
        page.evaluate(({ t, sid }) => {
          const w = window as any;
          const chunks = w.__e2eEvents?.[t]?.chunks || [];
          return chunks.some((c: any) => c?.streamId === sid);
        }, { t: token, sid: streamId }),
      );

    if (sawChunk) {
      await page.evaluate(async (sid) => {
        const w = window as any;
        await w.rina.invoke("rina:stream:cancel", sid);
      }, streamId);
    }

    await expect
      .poll(
        async () =>
          page.evaluate(({ t, sid }) => {
            const w = window as any;
            const ends = w.__e2eEvents?.[t]?.ends || [];
            return ends.find((e: any) => e?.streamId === sid) || null;
          }, { t: token, sid: streamId }),
        { timeout: 30000 },
      )
      .not.toBeNull();

    const endEvt = await page.evaluate(({ t, sid }) => {
      const w = window as any;
      const ends = w.__e2eEvents?.[t]?.ends || [];
      return ends.find((e: any) => e?.streamId === sid) || null;
    }, { t: token, sid: streamId });

    expect(endEvt).toBeTruthy();
    expect(endEvt.streamId).toBe(streamId);

    await page.evaluate((t) => {
      const w = window as any;
      const unsubs = w.__e2eEvents?.[`${t}_unsubs`] || [];
      for (const fn of unsubs) {
        if (typeof fn === "function") fn();
      }
      delete w.__e2eEvents?.[`${t}_unsubs`];
      delete w.__e2eEvents?.[t];
    }, token);
  });
});
