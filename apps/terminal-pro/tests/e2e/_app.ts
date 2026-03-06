import type { ElectronApplication, Page } from "playwright";
import { launchApp } from "./_launch";

export async function withApp<T>(fn: (args: { app: ElectronApplication; page: Page }) => Promise<T>): Promise<T> {
  const app = await launchApp();
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    return await fn({ app, page });
  } finally {
    await app.close();
  }
}
