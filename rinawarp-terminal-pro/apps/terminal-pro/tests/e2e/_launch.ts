import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { _electron as electron, type ElectronApplication } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, "../..");
const MAIN_ENTRY = path.join(APP_ROOT, "dist-electron", "main.js");
const PRELOAD_ENTRY = path.join(APP_ROOT, "dist-electron", "preload.cjs");
const RENDERER_ENTRY = path.join(APP_ROOT, "dist-electron", "renderer.html");

function formatLaunchContext(userDataDir: string) {
  return [
    `cwd=${APP_ROOT}`,
    `main=${MAIN_ENTRY}`,
    `preload=${PRELOAD_ENTRY}`,
    `renderer=${RENDERER_ENTRY}`,
    `userDataDir=${userDataDir}`,
  ].join("\n");
}

export async function launchApp(extraEnv?: Record<string, string>): Promise<ElectronApplication> {
  for (const entry of [MAIN_ENTRY, PRELOAD_ENTRY, RENDERER_ENTRY]) {
    if (!fs.existsSync(entry)) {
      throw new Error(`Missing Electron build artifact: ${entry}`);
    }
  }

  const providedUserDataDir = extraEnv?.RINAWARP_E2E_USER_DATA_DIR;
  const userDataDir = providedUserDataDir || fs.mkdtempSync(path.join(os.tmpdir(), "rinawarp-e2e-"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RINAWARP_ENV: "dev",
    RINAWARP_E2E: "1",
    ...extraEnv,
  };
  const isE2E = env.RINAWARP_E2E === "1" || env.CI === "1" || env.CI === "true";
  const launchArgs = [
    ...(isE2E ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] : []),
    `--user-data-dir=${userDataDir}`,
    MAIN_ENTRY,
  ];

  delete env.ELECTRON_RUN_AS_NODE;
  if (isE2E) env.ELECTRON_DISABLE_SANDBOX = "1";

  let app: ElectronApplication;
  try {
    app = await electron.launch({
      args: launchArgs,
      cwd: APP_ROOT,
      env,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "unknown launch failure");
    const sandboxCrash = /sandbox_host_linux\.cc|Process failed to launch!/i.test(message);
    const detail = sandboxCrash
      ? "Electron failed before app bootstrap. In this environment that usually means a Linux sandbox/runtime issue, not missing build output or broken acceptance-test logic."
      : "Electron failed during launch before the first window became available.";
    throw new Error(`${detail}\n${formatLaunchContext(userDataDir)}\nlaunchArgs=${JSON.stringify(launchArgs)}\n\n${message}`);
  }

  app.on("close", () => {
    if (!providedUserDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
  });
  return app;
}
