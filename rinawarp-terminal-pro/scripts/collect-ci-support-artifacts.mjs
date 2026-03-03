import fs from "node:fs";
import path from "node:path";
import { _electron as electron } from "playwright";

const outDir = process.argv[2] || "artifacts";
fs.mkdirSync(outDir, { recursive: true });

const appRoot = path.resolve("apps/terminal-pro");
const mainEntry = path.resolve("apps/terminal-pro/dist-electron/main.js");

const env = {
  ...process.env,
  RINAWARP_ENV: "dev",
  RINAWARP_E2E: "1",
  ELECTRON_DISABLE_SANDBOX: "1",
};
delete env.ELECTRON_RUN_AS_NODE;

const writeJson = (name, value) => {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2), "utf8");
};

let app;
try {
  app = await electron.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", mainEntry],
    cwd: appRoot,
    env,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");

  const diagnostics = await page.evaluate(async () => {
    const w = window;
    return w.rina.diagnosticsPaths();
  });
  writeJson("diagnostics.json", diagnostics);

  const bundle = await page.evaluate(async () => {
    const w = window;
    if (w.rina.supportBundle) return w.rina.supportBundle();
    return w.rina.invoke("rina:support:bundle");
  });
  writeJson("support-bundle-result.json", bundle);

  if (bundle?.ok && bundle?.path && fs.existsSync(bundle.path)) {
    const target = path.join(outDir, "support-bundle.zip");
    fs.copyFileSync(bundle.path, target);
  }
} catch (error) {
  writeJson("support-artifacts-error.json", {
    error: error instanceof Error ? error.message : String(error),
  });
} finally {
  try {
    await app?.close();
  } catch {
    // no-op
  }
}
