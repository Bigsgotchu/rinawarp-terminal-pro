import { expect, type Page } from "@playwright/test";

/**
 * Returns platform-appropriate modifier key for keyboard shortcuts.
 * On macOS: Meta (Cmd)
 * On Linux/Windows: Control
 */
export function modKey(key: string): string {
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  return `${mod}+${key}`;
}

export async function waitForIpcEvent(
  page: Page,
  channel: string,
  predicate: (payload: any) => boolean,
  timeoutMs = 15000,
): Promise<any> {
  const token = `__e2e_evt_${channel}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  await page.evaluate(
    ({ channel, token }) => {
      const w = window as any;
      w.__e2eEvents = w.__e2eEvents || {};
      w.__e2eEvents[token] = [];
      const unsub = w.rina.on(channel, (payload: any) => {
        w.__e2eEvents[token].push(payload);
      });
      w.__e2eEvents[`${token}_unsub`] = unsub;
    },
    { channel, token },
  );

  await expect
    .poll(
      async () => {
        const events = await page.evaluate(({ token }) => {
          const w = window as any;
          return w.__e2eEvents?.[token] || [];
        }, { token });
        return events.some((e: any) => predicate(e));
      },
      { timeout: timeoutMs },
    )
    .toBe(true);

  const events = await page.evaluate(({ token }) => {
    const w = window as any;
    return w.__e2eEvents?.[token] || [];
  }, { token });
  const found = events.find((e: any) => predicate(e)) || null;

  if (!found) throw new Error(`Timed out waiting for ${channel} event`);
  return found;
}

export async function cleanupIpcListener(page: Page, channel: string): Promise<void> {
  await page.evaluate(({ channel }) => {
    const w = window as any;
    const events = w.__e2eEvents || {};
    for (const k of Object.keys(events)) {
      if (!k.startsWith(`__e2e_evt_${channel}`) || k.endsWith("_unsub")) continue;
      const unsub = w.__e2eEvents?.[`${k}_unsub`];
      if (typeof unsub === "function") unsub();
      delete w.__e2eEvents?.[`${k}_unsub`];
      delete w.__e2eEvents?.[k];
    }
  }, { channel });
}
