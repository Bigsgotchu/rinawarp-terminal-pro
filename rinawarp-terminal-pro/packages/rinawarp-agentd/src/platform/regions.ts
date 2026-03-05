import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

export type RegionId = "us-east-1" | "eu-west-1";

type RegionState = {
  version: 1;
  defaultRegion: RegionId;
  workspaceRegion: Record<string, RegionId>;
  health: Record<RegionId, { status: "healthy" | "degraded" | "down"; updated_at: string }>;
};

function filePath(): string {
  return path.join(paths().baseDir, "regions.json");
}

function loadState(): RegionState {
  const fp = filePath();
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      defaultRegion: "us-east-1",
      workspaceRegion: {},
      health: {
        "us-east-1": { status: "healthy", updated_at: new Date(0).toISOString() },
        "eu-west-1": { status: "healthy", updated_at: new Date(0).toISOString() },
      },
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8")) as RegionState;
    if (!parsed || parsed.version !== 1) {
      return {
        version: 1,
        defaultRegion: "us-east-1",
        workspaceRegion: {},
        health: {
          "us-east-1": { status: "healthy", updated_at: new Date(0).toISOString() },
          "eu-west-1": { status: "healthy", updated_at: new Date(0).toISOString() },
        },
      };
    }
    return {
      version: 1,
      defaultRegion: parsed.defaultRegion || "us-east-1",
      workspaceRegion: parsed.workspaceRegion || {},
      health: {
        "us-east-1": {
          status: parsed.health?.["us-east-1"]?.status || "healthy",
          updated_at: parsed.health?.["us-east-1"]?.updated_at || new Date(0).toISOString(),
        },
        "eu-west-1": {
          status: parsed.health?.["eu-west-1"]?.status || "healthy",
          updated_at: parsed.health?.["eu-west-1"]?.updated_at || new Date(0).toISOString(),
        },
      },
    };
  } catch {
    return {
      version: 1,
      defaultRegion: "us-east-1",
      workspaceRegion: {},
      health: {
        "us-east-1": { status: "healthy", updated_at: new Date(0).toISOString() },
        "eu-west-1": { status: "healthy", updated_at: new Date(0).toISOString() },
      },
    };
  }
}

function saveState(state: RegionState): void {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function normalizeRegion(input: string): RegionId | null {
  const value = String(input || "").trim().toLowerCase();
  if (value === "us-east-1") return "us-east-1";
  if (value === "eu-west-1") return "eu-west-1";
  return null;
}

export function assignWorkspaceRegion(workspaceId: string, region: string): RegionId | null {
  const normalized = normalizeRegion(region);
  if (!normalized) return null;
  const state = loadState();
  state.workspaceRegion[String(workspaceId)] = normalized;
  saveState(state);
  return normalized;
}

export function getWorkspaceRegion(workspaceId: string): RegionId {
  const state = loadState();
  return state.workspaceRegion[String(workspaceId)] || state.defaultRegion || "us-east-1";
}

export function getRegionMap(): { default_region: RegionId; workspace_region: Record<string, RegionId> } {
  const state = loadState();
  return {
    default_region: state.defaultRegion,
    workspace_region: state.workspaceRegion,
  };
}

export function getRegionHealth(): Record<RegionId, { status: "healthy" | "degraded" | "down"; updated_at: string }> {
  return loadState().health;
}

export function setRegionHealth(
  region: string,
  status: "healthy" | "degraded" | "down",
): { region: RegionId; status: "healthy" | "degraded" | "down"; updated_at: string } | null {
  const normalized = normalizeRegion(region);
  if (!normalized) return null;
  const state = loadState();
  const next = {
    status,
    updated_at: new Date().toISOString(),
  };
  state.health[normalized] = next;
  saveState(state);
  return { region: normalized, ...next };
}

export function failoverDefaultRegion(): { from: RegionId; to: RegionId; changed: boolean } {
  const state = loadState();
  const current = state.defaultRegion;
  const currentHealth = state.health[current]?.status || "healthy";
  if (currentHealth === "healthy") return { from: current, to: current, changed: false };
  const candidates: RegionId[] = ["us-east-1", "eu-west-1"].filter((r) => r !== current) as RegionId[];
  const next =
    candidates.find((r) => state.health[r]?.status === "healthy") ||
    candidates.find((r) => state.health[r]?.status === "degraded") ||
    current;
  if (next !== current) {
    state.defaultRegion = next;
    saveState(state);
    return { from: current, to: next, changed: true };
  }
  return { from: current, to: current, changed: false };
}
