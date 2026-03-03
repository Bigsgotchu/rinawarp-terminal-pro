import type { App, IpcMain, Shell } from "electron";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type UpdateStatus = "idle" | "checking" | "up_to_date" | "update_available" | "error";

type UpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  checkedAt: string | null;
  manifestUrl: string;
  releaseUrl: string;
  error: string | null;
};

type ReleaseManifest = {
  version?: string;
  releasedAt?: string;
  downloadUrl?: string;
};

type RegisterUpdatesIpcArgs = {
  ipcMain: IpcMain;
  app: App;
  shell: Pick<Shell, "openExternal">;
  isE2E: boolean;
};

const DEFAULT_MANIFEST_URL = "https://www.rinawarptech.com/releases/latest.json";
const DEFAULT_RELEASE_URL = "https://www.rinawarptech.com/account/";
const TELEMETRY_ENDPOINT = "https://api.rinawarptech.com/api/events";
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function normalizeVersion(v: string): number[] {
  const core = String(v || "")
    .trim()
    .replace(/^v/i, "")
    .split("-")[0];
  return core.split(".").map((x) => Number.parseInt(x, 10) || 0);
}

function compareSemver(a: string, b: string): number {
  const av = normalizeVersion(a);
  const bv = normalizeVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i += 1) {
    const left = av[i] ?? 0;
    const right = bv[i] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function loadOrCreateAnonId(userDataPath: string): string {
  const file = path.join(userDataPath, "analytics-device-id.txt");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing) return existing;
  } catch {
    // ignore and create below
  }
  const id = randomUUID();
  try {
    fs.writeFileSync(file, `${id}\n`, "utf8");
  } catch {
    // ignore if filesystem write fails
  }
  return id;
}

function createTracker(anonId: string): (event: string, properties: Record<string, unknown>) => void {
  return (event: string, properties: Record<string, unknown>) => {
    const payload = {
      event,
      properties,
      path: "desktop://terminal-pro",
      href: "desktop://terminal-pro/settings/about",
      referrer: null,
      anon_id: anonId,
      session_id: `desktop-${process.pid}`,
      at: Date.now(),
      utm: {},
    };
    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // non-blocking telemetry
    });
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function createUpdateChecker(args: {
  currentVersion: string;
  manifestUrl: string;
  releaseUrl: string;
  track: (event: string, properties: Record<string, unknown>) => void;
}): { getState: () => UpdateState; checkForUpdates: (source: "manual" | "startup" | "interval") => Promise<UpdateState> } {
  let state: UpdateState = {
    status: "idle",
    currentVersion: args.currentVersion,
    latestVersion: null,
    checkedAt: null,
    manifestUrl: args.manifestUrl,
    releaseUrl: args.releaseUrl,
    error: null,
  };
  let checkingPromise: Promise<UpdateState> | null = null;
  const setState = (next: Partial<UpdateState>): UpdateState => {
    state = { ...state, ...next };
    return state;
  };

  const checkForUpdates = async (source: "manual" | "startup" | "interval"): Promise<UpdateState> => {
    if (checkingPromise) return checkingPromise;
    checkingPromise = (async () => {
      setState({ status: "checking", checkedAt: new Date().toISOString(), error: null });
      try {
        const payload = (await fetchJsonWithTimeout(args.manifestUrl)) as ReleaseManifest;
        const latest = String(payload?.version || "").trim();
        if (!latest) throw new Error("Manifest missing version");
        const manifestReleaseUrl = String(payload?.downloadUrl || "").trim() || args.releaseUrl;
        const newer = compareSemver(latest, args.currentVersion) > 0;
        const nextState = setState({
          status: newer ? "update_available" : "up_to_date",
          latestVersion: latest,
          checkedAt: new Date().toISOString(),
          releaseUrl: manifestReleaseUrl,
          error: null,
        });
        args.track("desktop_update_check", {
          source,
          status: nextState.status,
          currentVersion: args.currentVersion,
          latestVersion: latest,
        });
        return nextState;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown update check error";
        const nextState = setState({ status: "error", checkedAt: new Date().toISOString(), error: message });
        args.track("desktop_update_check", { source, status: "error", currentVersion: args.currentVersion, error: message });
        return nextState;
      } finally {
        checkingPromise = null;
      }
    })();
    return checkingPromise;
  };

  return { getState: () => state, checkForUpdates };
}

export function registerUpdatesIpc(args: RegisterUpdatesIpcArgs): void {
  const manifestUrl = process.env.RINAWARP_RELEASE_MANIFEST_URL || DEFAULT_MANIFEST_URL;
  const releaseUrl = process.env.RINAWARP_RELEASE_URL || DEFAULT_RELEASE_URL;
  const currentVersion = args.app.getVersion();
  const anonId = loadOrCreateAnonId(args.app.getPath("userData"));
  const track = createTracker(anonId);
  const checker = createUpdateChecker({ currentVersion, manifestUrl, releaseUrl, track });

  args.ipcMain.handle("rina:app:version", async () => args.app.getVersion());
  args.ipcMain.handle("rina:update:state", async () => checker.getState());
  args.ipcMain.handle("rina:update:check", async () => checker.checkForUpdates("manual"));
  args.ipcMain.handle("rina:update:open-download", async () => {
    const state = checker.getState();
    track("desktop_update_accept", {
      currentVersion,
      latestVersion: state.latestVersion,
      source: "settings_about",
    });
    await args.shell.openExternal(state.releaseUrl);
    return { ok: true, url: state.releaseUrl };
  });

  if (!args.isE2E) {
    setTimeout(() => {
      void checker.checkForUpdates("startup");
    }, 2500);
    setInterval(() => {
      void checker.checkForUpdates("interval");
    }, UPDATE_CHECK_INTERVAL_MS);
  }
}
