import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getRinaCloudConfig, RinaCloudClient, type RinaCloudAccountUsageResponse } from "./rina-cloud-client.js";

type StoredCloudAuth = {
  authToken?: string;
  updatedAt?: string;
};

function cloudAuthFilePath(): string {
  const explicit = String(process.env.RINAWARP_CLOUD_ACCOUNT_FILE || "").trim();
  if (explicit) return explicit;
  return path.join(os.homedir(), ".rinawarp-terminal-pro", "rina-cloud-auth.json");
}

function readStoredCloudAuth(): StoredCloudAuth {
  try {
    const raw = fs.readFileSync(cloudAuthFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getStoredRinaAuthToken(): string | null {
  const envToken = String(process.env.RINA_AUTH_TOKEN || "").trim();
  if (envToken) return envToken;
  const stored = readStoredCloudAuth();
  return String(stored.authToken || "").trim() || null;
}

export async function saveStoredRinaAuthToken(token: string): Promise<{ ok: true; hasToken: boolean }> {
  const clean = String(token || "").trim();
  const filePath = cloudAuthFilePath();
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    JSON.stringify({ authToken: clean, updatedAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
  return { ok: true, hasToken: !!clean };
}

export async function clearStoredRinaAuthToken(): Promise<{ ok: true; hasToken: false }> {
  try {
    await fsp.rm(cloudAuthFilePath(), { force: true });
  } catch {
    // Ignore best-effort local placeholder cleanup.
  }
  return { ok: true, hasToken: false };
}

export function getRinaCloudClientWithStoredToken(): RinaCloudClient {
  const config = getRinaCloudConfig();
  return new RinaCloudClient({
    ...config,
    authToken: getStoredRinaAuthToken(),
  });
}

export async function getRinaCloudAccountUsage(): Promise<RinaCloudAccountUsageResponse> {
  return await getRinaCloudClientWithStoredToken().usage();
}

export async function createRinaCloudCheckoutSession(args: { email?: string } = {}) {
  return await getRinaCloudClientWithStoredToken().createCheckoutSession(args);
}

export async function createRinaCloudPortalSession() {
  return await getRinaCloudClientWithStoredToken().createPortalSession();
}

export async function getRinaCloudAccountStatus(): Promise<{
  ok: boolean;
  configured: boolean;
  hasToken: boolean;
  usage?: RinaCloudAccountUsageResponse;
  error?: string;
  code?: string;
  status?: number;
}> {
  const config = getRinaCloudConfig();
  const hasToken = !!getStoredRinaAuthToken();
  if (!config.apiBase) {
    return {
      ok: false,
      configured: false,
      hasToken,
      code: "unavailable",
      error: "Rina Cloud is unavailable. Local recovery workflows still work.",
    };
  }
  try {
    const usage = await getRinaCloudAccountUsage();
    return { ok: true, configured: true, hasToken, usage };
  } catch (error: any) {
    return {
      ok: false,
      configured: true,
      hasToken,
      error: error?.messageForUser || error?.message || "Rina Cloud account check failed.",
      code: error?.code,
      status: error?.status,
    };
  }
}
