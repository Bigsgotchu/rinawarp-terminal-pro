import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDotEnvFile } from "./env.js";

export const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || "http://127.0.0.1:5055";
export const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || "";
export const IS_E2E = process.env.RINAWARP_E2E === "1";

const fallbackEnv = process.env.RINAWARP_USE_LOCAL_ENGINE_FALLBACK;
export const ALLOW_LOCAL_ENGINE_FALLBACK =
  fallbackEnv == null || fallbackEnv === ""
    ? true
    : /^(1|true|yes)$/i.test(fallbackEnv);

export const TOP_CPU_CMD_SAFE =
  "ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk3 | head -15 || ps aux | head -15";
export const TOP_MEM_CMD_SAFE =
  "ps -eo pid,pcpu,pmem,comm --sort=-pmem 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk4 | head -15 || ps aux | head -15";
export const TOP_CPU_CMD_SAFE_SHORT =
  "ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -10 || ps aux 2>/dev/null | sort -nrk3 | head -10 || ps aux | head -10";

export function createProjectConfig(metaUrl: string) {
  const filename = fileURLToPath(metaUrl);
  const dirname = path.dirname(filename);
  const appProjectRoot = path.resolve(dirname, "..");
  const repoRoot = path.resolve(appProjectRoot, "..", "..");
  return { filename, dirname, appProjectRoot, repoRoot };
}

export function loadDevEnvFiles(args: {
  appProjectRoot: string;
  isPackaged: boolean;
  isE2E: boolean;
}): void {
  if (args.isPackaged || args.isE2E) return;

  const protectedKeys = new Set(Object.keys(process.env));
  const envFiles = [
    path.join(args.appProjectRoot, ".env"),
    path.join(args.appProjectRoot, ".env.local"),
  ];

  for (const filePath of envFiles) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const parsed = parseDotEnvFile(fs.readFileSync(filePath, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (protectedKeys.has(key)) continue;
        process.env[key] = value;
      }
    } catch (error) {
      console.warn(`[env] Failed to load ${path.basename(filePath)}:`, error);
    }
  }
}

export function createUserDataPathBuilders(getUserDataPath: () => string) {
  return {
    themeSelectionFile: () => path.join(getUserDataPath(), "theme.json"),
    customThemesFile: () => path.join(getUserDataPath(), "themes.custom.json"),
    inlineRinaRunsFile: () => path.join(getUserDataPath(), "inline-rina-runs.json"),
    sharesFile: () => path.join(getUserDataPath(), "shares.json"),
    teamFile: () => path.join(getUserDataPath(), "team-workspace.json"),
    teamInvitesFile: () => path.join(getUserDataPath(), "team-invites.json"),
    teamActivityFile: () => path.join(getUserDataPath(), "team-activity.ndjson"),
    rendererErrorsFile: () => path.join(getUserDataPath(), "renderer-errors.ndjson"),
  };
}
