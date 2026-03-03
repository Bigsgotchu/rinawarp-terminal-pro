import { app, BrowserWindow, ipcMain, type WebContents, dialog, shell } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { verifyLicense, type LicenseVerifyResponse } from "./license.js";
import { featureFlags } from "./feature-flags.js";
import { StructuredSessionStore } from "./structured-session.js";
import { PersonalityStore } from "./personality.js";
import { redactText } from "@rinawarp/safety/redaction";
import { type ShellKind, detectCommandBoundaries } from "./prompt-boundary.js";
import { defaultProfileForProject, gateCommandRun, summarizeProfile } from "./agent-profile.js";
import { loadProjectRules, rulesToSystemBlock } from "./rules-loader.js";
import { scoreTextMatch } from "./search-ranking.js";
import { riskFromPlanStep } from "./plan-risk.js";
import { haltReasonFromFallbackStep } from "./plan-fallback.js";
import type { AppContext } from "./main/context.js";
import { registerAllIpc } from "./main/ipc/registerAllIpc.js";
import { resolveResourcePath as resolveMainResourcePath } from "./main/resources.js";
import {
  canonicalizePath,
  isWithinRoot,
  normalizeProjectRoot as normalizeProjectRootFromSecurity,
  resolveProjectRootSafe as resolveProjectRootSafeFromSecurity,
} from "./security/projectRoot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_PROJECT_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_PROJECT_ROOT, "..", "..");

// ============================================================
// SECURITY: Project Root Validation
// ============================================================
// Allowed workspace roots - constrain execution to these directories
const ALLOWED_WORKSPACE_ROOTS: string[] = [];

function normalizeProjectRoot(input: string, workspaceRoot?: string): string {
  return normalizeProjectRootFromSecurity({
    input,
    workspaceRoot,
    allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
  });
}

function resolveProjectRootSafe(input?: string): string {
  return resolveProjectRootSafeFromSecurity({
    input,
    allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
  });
}

// ============================================================
// ENGINE EXECUTION LAYER (Security)
// ============================================================
// All terminal execution now routes through the ExecutionEngine.
// This prevents bypass attacks by ensuring all spawning happens
// inside Tool implementations with proper enforcement.

import { ExecutionEngine, type ExecutionContext, type LicenseTier, type ConfirmationToken, type ToolEvent } from "@rinawarp/core/enforcement/index.js";
import { createStandardRegistry } from "@rinawarp/core/tools/registry.js";
import { buildExecutionContext, executeViaEngine } from "@rinawarp/core/adapters/unify-execution.js";

// Create engine instance once
const registry = createStandardRegistry();
const engine = new ExecutionEngine(registry);
let structuredSessionStore: StructuredSessionStore | null = null;
const personalityStore = new PersonalityStore();
const ctx: AppContext = {
  structuredSessionStore: null,
  lastLoadedThemePath: null,
  lastLoadedPolicyPath: null,
};

type ThemeSpec = {
  id: string;
  name: string;
  group?: string;
  vars: Record<string, string>;
  terminal?: {
    background: string;
    foreground: string;
    cursor?: string;
    selection?: string;
    ansi: string[];
  };
};

type ThemeRegistry = { themes: ThemeSpec[] };

// Runtime entitlement state (authoritative for local execution gating)
let currentLicenseTier: LicenseTier = "starter";
let currentLicenseToken: string | null = null;
let currentLicenseExpiresAt: number | null = null;
let currentLicenseCustomerId: string | null = null;
const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || "http://127.0.0.1:5055";
const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || "";
const IS_E2E = process.env.RINAWARP_E2E === "1";
if (app.isPackaged && process.env.ELECTRON_DISABLE_SANDBOX === "1") {
  console.warn("[security] Ignoring ELECTRON_DISABLE_SANDBOX in packaged builds.");
  delete process.env.ELECTRON_DISABLE_SANDBOX;
}
const fallbackEnv = process.env.RINAWARP_USE_LOCAL_ENGINE_FALLBACK;
const ALLOW_LOCAL_ENGINE_FALLBACK =
  fallbackEnv == null || fallbackEnv === ""
    ? true
    : /^(1|true|yes)$/i.test(fallbackEnv);
const TOP_CPU_CMD_SAFE =
  "ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk3 | head -15 || ps aux | head -15";
const TOP_MEM_CMD_SAFE =
  "ps -eo pid,pcpu,pmem,comm --sort=-pmem 2>/dev/null | head -15 || ps aux 2>/dev/null | sort -nrk4 | head -15 || ps aux | head -15";
const TOP_CPU_CMD_SAFE_SHORT =
  "ps -eo pid,pcpu,pmem,comm --sort=-pcpu 2>/dev/null | head -10 || ps aux 2>/dev/null | sort -nrk3 | head -10 || ps aux | head -10";

type PolicyEnv = "dev" | "staging" | "prod";
type PolicyAction = "allow" | "deny" | "require_approval" | "require_two_step";
type PolicyApproval = "none" | "click" | "typed_yes" | "typed_phrase";
type PolicyRule = {
  id: string;
  action: PolicyAction;
  approval?: PolicyApproval;
  typedPhrase?: string;
  message?: string;
  envAny?: string[];
  regexes: RegExp[];
};
type ParsedPolicy = {
  rules: PolicyRule[];
  fallback: {
    action: PolicyAction;
    approval?: PolicyApproval;
    typedPhrase?: string;
    message?: string;
  };
};

let cachedPolicy: ParsedPolicy | null | undefined;
const THEME_SELECTION_FILE = () => path.join(app.getPath("userData"), "theme.json");
const CUSTOM_THEMES_FILE = () => path.join(app.getPath("userData"), "themes.custom.json");
const ALLOWED_THEME_VAR_KEYS = new Set([
  "--rw-bg",
  "--rw-panel",
  "--rw-border",
  "--rw-text",
  "--rw-muted",
  "--rw-accent",
  "--rw-accent2",
  "--rw-danger",
  "--rw-success",
]);

function resolveResourcePath(relPath: string, devBase: "repo" | "app"): string {
  return resolveMainResourcePath({
    relPath,
    devBase,
    repoRoot: REPO_ROOT,
    appProjectRoot: APP_PROJECT_ROOT,
    dirname: __dirname,
  });
}

function warnIfUnexpectedPackagedResource(resourceName: string, resolvedPath: string): void {
  if (!app.isPackaged) return;
  const target = canonicalizePath(resolvedPath);
  const allowedBases = [app.getAppPath(), process.resourcesPath].map((p) => canonicalizePath(p));
  const allowed = allowedBases.some((base) => isWithinRoot(target, base));
  if (!allowed) {
    console.warn(`[security] Unexpected packaged ${resourceName} path outside app/resources: ${target}`);
  }
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: Array<{ name: string; data: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const dataBuf = f.data;
    const checksum = crc32(dataBuf);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([local, nameBuf, dataBuf]);
    localHeaders.push(localEntry);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(dataBuf.length, 20);
    central.writeUInt32LE(dataBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralHeaders.push(Buffer.concat([central, nameBuf]));

    offset += localEntry.length;
  }

  const centralStart = offset;
  const centralBlob = Buffer.concat(centralHeaders);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBlob.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, centralBlob, eocd]);
}

function readTailLines(filePath: string, maxLines: number): string {
  try {
    if (!fs.existsSync(filePath)) return "";
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const start = Math.max(0, lines.length - Math.max(1, maxLines));
    return lines.slice(start).join("\n");
  } catch {
    return "";
  }
}

async function showSaveDialogForBundle(defaultPath: string) {
  if (IS_E2E) {
    return {
      canceled: false,
      filePath: path.join(
        app.getPath("temp"),
        `rinawarp-support-bundle-e2e-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.zip`,
      ),
    };
  }
  return dialog.showSaveDialog({
    title: "Save Support Bundle",
    defaultPath,
    filters: [{ name: "Zip", extensions: ["zip"] }],
  });
}

function readJsonIfExists<T>(p: string): T | null {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(p: string, value: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2), "utf-8");
}

function loadSharesDb(): SharesDb {
  const parsed = readJsonIfExists<SharesDb>(SHARES_FILE()) ?? { shares: [] };
  const normalized = (parsed.shares || []).map((s) => {
    const createdAt = s.createdAt || new Date().toISOString();
    const expiresAt = s.expiresAt || new Date(Date.parse(createdAt) + 7 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: s.id,
      createdAt,
      createdBy: s.createdBy || "owner@local",
      title: s.title,
      content: s.content || "",
      revoked: !!s.revoked,
      expiresAt,
      requiredRole: s.requiredRole || "viewer",
    } as ShareRecord;
  });
  return { shares: normalized };
}

function saveSharesDb(db: SharesDb) {
  writeJsonFile(SHARES_FILE(), db);
}

function loadTeamDb(): TeamDb {
  return readJsonIfExists<TeamDb>(TEAM_FILE()) ?? {
    currentUser: "owner@local",
    members: [{ email: "owner@local", role: "owner" }],
  };
}

function saveTeamDb(db: TeamDb) {
  writeJsonFile(TEAM_FILE(), db);
}

function loadTeamInvitesDb(): TeamInvitesDb {
  const parsed = readJsonIfExists<TeamInvitesDb>(TEAM_INVITES_FILE()) ?? { invites: [] };
  const nowMs = Date.now();
  const normalized = (parsed.invites || []).map((inv) => {
    const expiresAt = inv.expiresAt || new Date(nowMs + 72 * 60 * 60 * 1000).toISOString();
    const expired = Date.parse(expiresAt) <= nowMs;
    const status = inv.status === "accepted" || inv.status === "revoked" ? inv.status : expired ? "expired" : "pending";
    return {
      id: inv.id || `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      token: inv.token || "",
      email: String(inv.email || "").trim().toLowerCase(),
      role: inv.role && ["owner", "operator", "viewer"].includes(inv.role) ? inv.role : "viewer",
      createdAt: inv.createdAt || new Date().toISOString(),
      createdBy: inv.createdBy || "owner@local",
      expiresAt,
      status,
      acceptedAt: inv.acceptedAt,
      acceptedBy: inv.acceptedBy,
    } as TeamInviteRecord;
  });
  return { invites: normalized };
}

function saveTeamInvitesDb(db: TeamInvitesDb) {
  writeJsonFile(TEAM_INVITES_FILE(), db);
}

function loadTeamActivity(limit = 200): TeamActivityRecord[] {
  try {
    const p = TEAM_ACTIVITY_FILE();
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, "utf-8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const parsed: TeamActivityRecord[] = [];
    for (const line of lines) {
      try {
        const rec = JSON.parse(line) as TeamActivityRecord;
        if (!rec || !rec.id || !rec.timestamp || !rec.actor || !rec.action || !rec.target) continue;
        parsed.push(rec);
      } catch {
        // skip malformed line
      }
    }
    return parsed.slice(-Math.max(1, Math.floor(limit))).reverse();
  } catch {
    return [];
  }
}

function appendTeamActivity(action: TeamActivityAction, target: string, details?: TeamActivityRecord["details"]) {
  try {
    const rec: TeamActivityRecord = {
      id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      actor: getCurrentUserEmail(),
      actorRole: getCurrentRole(),
      action,
      target: String(target || "unknown"),
      details,
    };
    fs.mkdirSync(path.dirname(TEAM_ACTIVITY_FILE()), { recursive: true });
    fs.appendFileSync(TEAM_ACTIVITY_FILE(), `${JSON.stringify(rec)}\n`, "utf-8");
  } catch {
    // swallow activity log write failures
  }
}

function getCurrentRole(): Role {
  const team = loadTeamDb();
  const user = team.currentUser || "owner@local";
  const role = team.members.find((m) => m.email === user)?.role;
  return role || "owner";
}

function getCurrentUserEmail(): string {
  const team = loadTeamDb();
  return team.currentUser || "owner@local";
}

function roleRank(role: Role): number {
  if (role === "owner") return 3;
  if (role === "operator") return 2;
  return 1;
}

function hasRoleAtLeast(current: Role, required: Role): boolean {
  return roleRank(current) >= roleRank(required);
}

function safeSend(target: WebContents | null | undefined, channel: string, payload?: unknown): boolean {
  if (!target) return false;
  try {
    if (target.isDestroyed()) return false;
    target.send(channel, payload);
    return true;
  } catch {
    return false;
  }
}

function importShellHistory(limit = 300): { imported: number; commands: string[] } {
  const home = process.env.HOME || os.homedir();
  const files = [
    path.join(home, ".bash_history"),
    path.join(home, ".zsh_history"),
    path.join(home, ".local", "share", "fish", "fish_history"),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let raw = "";
    try {
      raw = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      let cmd = String(line || "").trim();
      if (!cmd) continue;
      if (cmd.startsWith(": ")) {
        const idx = cmd.indexOf(";");
        if (idx > -1) cmd = cmd.slice(idx + 1).trim();
      }
      if (cmd.includes("- cmd:")) continue;
      if (cmd.startsWith("- cmd:")) cmd = cmd.replace(/^- cmd:\s*/, "").trim();
      if (!cmd || cmd.length < 2) continue;
      if (!seen.has(cmd)) {
        seen.add(cmd);
        out.push(cmd);
      }
    }
  }
  const picked = out.slice(-Math.max(10, Math.min(limit, 2000)));
  return { imported: picked.length, commands: picked };
}

function fallbackThemeRegistry(): ThemeRegistry {
  return {
    themes: [
      {
        id: "mermaid-teal",
        name: "Mermaid - Teal",
        group: "Mermaid",
        vars: {
          "--rw-bg": "#061013",
          "--rw-panel": "rgba(255,255,255,0.03)",
          "--rw-border": "rgba(255,255,255,0.10)",
          "--rw-text": "rgba(255,255,255,0.92)",
          "--rw-muted": "rgba(255,255,255,0.68)",
          "--rw-accent": "#2de2e6",
          "--rw-accent2": "#7af3f5",
          "--rw-danger": "#ff4d6d",
          "--rw-success": "#3cffb5",
        },
        terminal: {
          background: "#061013",
          foreground: "#eaffff",
          cursor: "#2de2e6",
          selection: "rgba(45, 226, 230, 0.18)",
          ansi: [
            "#07161a",
            "#ff4d6d",
            "#3cffb5",
            "#ffd166",
            "#61a0ff",
            "#b57bff",
            "#2de2e6",
            "#eaffff",
            "#23454f",
            "#ff7aa2",
            "#7bffd9",
            "#ffe199",
            "#92c0ff",
            "#d3a8ff",
            "#7af3f5",
            "#ffffff",
          ],
        },
      },
      {
        id: "unicorn",
        name: "Unicorn",
        group: "Fantasy",
        vars: {
          "--rw-bg": "#070614",
          "--rw-panel": "rgba(255,255,255,0.035)",
          "--rw-border": "rgba(255,255,255,0.11)",
          "--rw-text": "rgba(255,255,255,0.93)",
          "--rw-muted": "rgba(255,255,255,0.70)",
          "--rw-accent": "#b57bff",
          "--rw-accent2": "#ff3bbf",
          "--rw-danger": "#ff4d6d",
          "--rw-success": "#3cffb5",
        },
        terminal: {
          background: "#070614",
          foreground: "#f7e9ff",
          cursor: "#ff3bbf",
          selection: "rgba(181, 123, 255, 0.20)",
          ansi: [
            "#12102a",
            "#ff4d6d",
            "#3cffb5",
            "#ffd166",
            "#61a0ff",
            "#b57bff",
            "#ff3bbf",
            "#f7e9ff",
            "#3b2a4a",
            "#ff7aa2",
            "#7bffd9",
            "#ffe199",
            "#92c0ff",
            "#d3a8ff",
            "#ff7ad9",
            "#ffffff",
          ],
        },
      },
    ],
  };
}

function loadBaseThemeRegistry(): ThemeRegistry {
  const file = resolveResourcePath("themes/themes.json", "app");
  warnIfUnexpectedPackagedResource("theme registry", file);
  const parsed = readJsonIfExists<ThemeRegistry>(file);
  if (parsed?.themes?.length) {
    ctx.lastLoadedThemePath = file;
    return parsed;
  }
  ctx.lastLoadedThemePath = null;
  return fallbackThemeRegistry();
}

function loadCustomThemeRegistry(): ThemeRegistry {
  return readJsonIfExists<ThemeRegistry>(CUSTOM_THEMES_FILE()) ?? { themes: [] };
}

function loadThemeRegistryMerged(): ThemeRegistry {
  const base = loadBaseThemeRegistry();
  const custom = loadCustomThemeRegistry();
  const map = new Map<string, ThemeSpec>();
  for (const t of base.themes || []) map.set(t.id, t);
  for (const t of custom.themes || []) map.set(t.id, t);
  return { themes: Array.from(map.values()) };
}

function loadSelectedThemeId(): string {
  const data = readJsonIfExists<{ id?: string }>(THEME_SELECTION_FILE());
  return data?.id || "mermaid-teal";
}

function saveSelectedThemeId(id: string) {
  writeJsonFile(THEME_SELECTION_FILE(), { id });
}

function validateTheme(theme: ThemeSpec): { ok: boolean; error?: string } {
  if (!theme?.id || !/^[a-z0-9-]{3,64}$/i.test(theme.id)) return { ok: false, error: "Invalid id" };
  if (!theme?.name || theme.name.length < 2) return { ok: false, error: "Invalid name" };
  if (!theme?.vars || typeof theme.vars !== "object") return { ok: false, error: "Missing vars" };
  for (const key of Object.keys(theme.vars)) {
    if (!ALLOWED_THEME_VAR_KEYS.has(key)) return { ok: false, error: `Disallowed var: ${key}` };
    if (typeof theme.vars[key] !== "string") return { ok: false, error: `Var not string: ${key}` };
  }
  if (theme.terminal) {
    if (!theme.terminal.background || !theme.terminal.foreground) {
      return { ok: false, error: "Terminal bg/fg required" };
    }
    if (!Array.isArray(theme.terminal.ansi) || theme.terminal.ansi.length !== 16) {
      return { ok: false, error: "Terminal ansi must have 16 colors" };
    }
  }
  return { ok: true };
}

function currentPolicyEnv(): PolicyEnv {
  const raw = (process.env.RINAWARP_ENV || process.env.NODE_ENV || "dev").toLowerCase();
  if (raw.includes("prod")) return "prod";
  if (raw.includes("stag")) return "staging";
  return "dev";
}

function parseRuleBlock(block: string): PolicyRule | null {
  const id = block.match(/-\s+id:\s*([^\n]+)/)?.[1]?.trim();
  const action = block.match(/\naction:\s*([a-z_]+)/)?.[1]?.trim() as PolicyAction | undefined;
  if (!id || !action) return null;
  const approval = block.match(/\napproval:\s*([a-z_]+)/)?.[1]?.trim() as PolicyApproval | undefined;
  const typedPhrase = block.match(/\ntyped_phrase:\s*"?([^\n"]+)"?/)?.[1]?.trim();
  const message = block.match(/\nmessage:\s*"?([^\n"]+)"?/)?.[1]?.trim();

  const regexes: RegExp[] = [];
  for (const m of block.matchAll(/-\s*'([^']+)'/g)) {
    try {
      regexes.push(new RegExp(m[1], "i"));
    } catch {
      // ignore invalid regex
    }
  }

  let envAny: string[] | undefined;
  const envBlock = block.match(/when:\s*[\s\S]*?env:\s*[\s\S]*?any:\s*((?:\n\s*-\s*[^\n]+)+)/);
  if (envBlock?.[1]) {
    envAny = Array.from(envBlock[1].matchAll(/\n\s*-\s*([^\n]+)/g)).map((x) => x[1].trim());
  }

  return { id, action, approval, typedPhrase, message, envAny, regexes };
}

function loadPolicy(): ParsedPolicy {
  if (cachedPolicy !== undefined) return cachedPolicy || {
    rules: [],
    fallback: { action: "require_approval", approval: "click", message: "Unclassified command requires approval." },
  };

  let text = "";
  const policyPath = resolveResourcePath("policy/rinawarp-policy.yaml", "repo");
  warnIfUnexpectedPackagedResource("policy yaml", policyPath);
  if (fs.existsSync(policyPath)) {
    text = fs.readFileSync(policyPath, "utf8");
    ctx.lastLoadedPolicyPath = policyPath;
  } else {
    ctx.lastLoadedPolicyPath = null;
  }
  if (!text) {
    cachedPolicy = null;
    return loadPolicy();
  }

  const rulesSection = text.match(/\nrules:\s*\n([\s\S]*?)\nfallback:\s*\n/)?.[1] || "";
  const fallbackSection = text.split(/\nfallback:\s*\n/)[1] || "";
  const blocks: string[] = [];
  const starts = Array.from(rulesSection.matchAll(/(^|\n)\s*-\s+id:\s*[^\n]+/g)).map((m) => m.index ?? 0);
  for (let i = 0; i < starts.length; i += 1) {
    const s = starts[i];
    const e = i + 1 < starts.length ? starts[i + 1] : rulesSection.length;
    blocks.push(rulesSection.slice(s, e));
  }

  const rules = blocks.map(parseRuleBlock).filter((x): x is PolicyRule => !!x);
  const fallbackAction = (fallbackSection.match(/\naction:\s*([a-z_]+)/)?.[1]?.trim() as PolicyAction | undefined) || "require_approval";
  const fallbackApproval = fallbackSection.match(/\napproval:\s*([a-z_]+)/)?.[1]?.trim() as PolicyApproval | undefined;
  const fallbackPhrase = fallbackSection.match(/\ntyped_phrase:\s*"?([^\n"]+)"?/)?.[1]?.trim();
  const fallbackMessage = fallbackSection.match(/\nmessage:\s*"?([^\n"]+)"?/)?.[1]?.trim();

  cachedPolicy = {
    rules,
    fallback: {
      action: fallbackAction,
      approval: fallbackApproval,
      typedPhrase: fallbackPhrase,
      message: fallbackMessage,
    },
  };
  return cachedPolicy;
}

function hasRecentCommand(regex: RegExp, n: number): boolean {
  const recent = sessionState.entries
    .filter((e) => e.type === "execution_start")
    .slice(-Math.max(1, n));
  return recent.some((e) => regex.test((e as Extract<TranscriptEntry, { type: "execution_start" }>).command));
}

function evaluatePolicyGate(command: string, confirmed: boolean, confirmationText: string): { ok: boolean; message?: string } {
  const policy = loadPolicy();
  const env = currentPolicyEnv();
  const match = policy.rules.find((rule) => {
    if (rule.envAny && !rule.envAny.includes(env)) return false;
    return rule.regexes.some((r) => r.test(command));
  });

  const action = match?.action || policy.fallback.action;
  const approval = match?.approval || policy.fallback.approval || "click";
  const typedPhrase = match?.typedPhrase || policy.fallback.typedPhrase || "YES";
  const message = match?.message || policy.fallback.message || "Policy blocked this command.";

  if (action === "deny") return { ok: false, message };
  if (action === "allow") return { ok: true };

  if (currentPolicyEnv() === "prod" && /high-impact|rm\s+-rf|terraform\s+apply|kubectl/i.test(command)) {
    const role = getCurrentRole();
    if (role !== "owner") {
      return { ok: false, message: "Policy: only owner can execute high-impact commands in prod." };
    }
  }

  if (/terraform\s+apply/i.test(command) && !hasRecentCommand(/\bterraform\s+plan\b/i, 5)) {
    return { ok: false, message: "Policy: terraform apply requires a recent terraform plan." };
  }

  if (!confirmed) return { ok: false, message: `${message} Confirmation required.` };
  if (approval === "typed_yes" && confirmationText !== "YES") {
    return { ok: false, message: 'Policy: typed confirmation must be exactly "YES".' };
  }
  if (approval === "typed_phrase" && confirmationText !== typedPhrase) {
    return { ok: false, message: `Policy: typed phrase must be exactly "${typedPhrase}".` };
  }
  return { ok: true };
}

function explainPolicy(command: string): {
  env: PolicyEnv;
  action: PolicyAction;
  approval: PolicyApproval;
  message: string;
  typedPhrase?: string;
  matchedRuleId?: string;
} {
  const policy = loadPolicy();
  const env = currentPolicyEnv();
  const match = policy.rules.find((rule) => {
    if (rule.envAny && !rule.envAny.includes(env)) return false;
    return rule.regexes.some((r) => r.test(command));
  });
  return {
    env,
    action: match?.action || policy.fallback.action,
    approval: match?.approval || policy.fallback.approval || "click",
    message: match?.message || policy.fallback.message || "Unclassified command requires approval.",
    typedPhrase: match?.typedPhrase || policy.fallback.typedPhrase,
    matchedRuleId: match?.id,
  };
}

function mapApiTierToLicenseTier(apiTier: string): LicenseTier {
  const t = apiTier.trim().toLowerCase();
  if (t === "pro") return "pro";
  if (t === "creator") return "creator";
  if (t === "pioneer") return "pioneer";
  if (t === "founder") return "founder";
  if (t === "enterprise") return "enterprise";
  // Stripe worker currently emits "team" as the top tier.
  if (t === "team") return "enterprise";
  return "starter";
}

function applyVerifiedLicense(data: LicenseVerifyResponse): LicenseTier {
  const tier = mapApiTierToLicenseTier(data.tier);
  currentLicenseTier = tier;
  currentLicenseToken = data.license_token ?? null;
  currentLicenseExpiresAt = Number.isFinite(data.expires_at) ? data.expires_at : null;
  currentLicenseCustomerId = data.customer_id ?? null;
  currentLicenseStatus = data.status ?? "active";
  return tier;
}

function resetLicenseToStarter() {
  currentLicenseTier = "starter";
  currentLicenseToken = null;
  currentLicenseExpiresAt = null;
  currentLicenseCustomerId = null;
}

function getLicenseState() {
  return {
    tier: currentLicenseTier,
    has_token: !!currentLicenseToken,
    expires_at: currentLicenseExpiresAt,
    customer_id: currentLicenseCustomerId,
    status: currentLicenseStatus,
  };
}

function getCurrentLicenseCustomerId(): string | null {
  return currentLicenseCustomerId;
}

function buildAgentdHeaders(opts?: { includeLicenseToken?: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (AGENTD_AUTH_TOKEN) {
    headers.authorization = `Bearer ${AGENTD_AUTH_TOKEN}`;
  }
  if (opts?.includeLicenseToken && currentLicenseToken) {
    headers["x-rinawarp-license-token"] = currentLicenseToken;
  }
  return headers;
}

async function agentdJson<T>(
  path: string,
  init: {
    method: "GET" | "POST";
    body?: unknown;
    includeLicenseToken?: boolean;
  },
): Promise<T> {
  const res = await fetch(`${AGENTD_BASE_URL}${path}`, {
    method: init.method,
    headers: buildAgentdHeaders({ includeLicenseToken: init.includeLicenseToken }),
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || `${init.method} ${path} failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

type DaemonTaskStatus = "queued" | "running" | "completed" | "failed" | "canceled";

async function daemonStatus(): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; daemon?: any; tasks?: any }>("/v1/daemon/status", {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      daemon: { running: false, pid: null, storeDir: null },
      tasks: { total: 0, counts: {} },
    };
  }
}

async function daemonTasks(args?: { status?: DaemonTaskStatus; deadLetter?: boolean }): Promise<any> {
  const q = new URLSearchParams();
  if (args?.status) q.set("status", args.status);
  if (args?.deadLetter) q.set("deadLetter", "1");
  const suffix = q.size > 0 ? `?${q.toString()}` : "";
  try {
    return await agentdJson<{ ok: boolean; tasks?: any[]; updatedAt?: string }>(`/v1/daemon/tasks${suffix}`, {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      tasks: [],
    };
  }
}

async function daemonTaskAdd(args: { type: string; payload?: Record<string, unknown>; maxAttempts?: number }): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; task?: any }>("/v1/daemon/tasks", {
      method: "POST",
      body: {
        type: args?.type,
        payload: args?.payload ?? {},
        maxAttempts: args?.maxAttempts,
      },
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function daemonStart(): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; started?: boolean; alreadyRunning?: boolean; pid?: number }>("/v1/daemon/start", {
      method: "POST",
      body: {},
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function daemonStop(): Promise<any> {
  try {
    return await agentdJson<{ ok: boolean; stopped?: boolean; stale?: boolean; pid?: number }>("/v1/daemon/stop", {
      method: "POST",
      body: {},
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchRemotePlanForIpc(payload: { intentText: string; projectRoot: string }): Promise<any> {
  const resp = await agentdJson<{ ok: true; plan: any }>("/v1/plan", {
    method: "POST",
    body: payload,
    includeLicenseToken: false,
  });
  return resp.plan;
}

async function executeRemotePlanForIpc(payload: {
  plan: any[];
  projectRoot: string;
  confirmed: boolean;
  confirmationText: string;
}): Promise<{ ok: true; planRunId: string }> {
  return await agentdJson<{ ok: true; planRunId: string }>("/v1/execute-plan", {
    method: "POST",
    body: payload,
    includeLicenseToken: true,
  });
}

async function orchestratorIssueToPrForIpc(args: {
  issueId: string;
  repoPath: string;
  branchName?: string;
  command?: string;
  repoSlug?: string;
  push?: boolean;
  prDryRun?: boolean;
  baseBranch?: string;
  prTitle?: string;
  prBody?: string;
  commitMessage?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/issue-to-pr", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorGraphForIpc(): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/workspace-graph", {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      graph: { nodes: [], edges: [] },
    };
  }
}

async function orchestratorPrepareBranchForIpc(args: {
  repoPath: string;
  issueId?: string;
  branchName?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/git/prepare-branch", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorCreatePrForIpc(args: {
  repoSlug: string;
  head: string;
  base?: string;
  title: string;
  body?: string;
  draft?: boolean;
  dryRun?: boolean;
  workflowId?: string;
  issueId?: string;
  branchName?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/github/create-pr", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorPrStatusForIpc(args: {
  workflowId: string;
  status: "planned" | "opened" | "merged" | "closed" | "failed";
  issueId?: string;
  branchName?: string;
  repoSlug?: string;
  mode?: "dry_run" | "live";
  number?: number;
  url?: string;
  error?: string;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/github/pr-status", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorWebhookAuditForIpc(args?: {
  limit?: number;
  outcome?: "accepted" | "rejected";
  mapped?: "pr_status" | "ci_status" | "review_revision";
}): Promise<any> {
  try {
    const role = getCurrentRole();
    if (!hasRoleAtLeast(role, "operator")) {
      return {
        ok: false,
        error: "Only owner/operator can access webhook audit events.",
        entries: [],
        count: 0,
      };
    }
    const params = new URLSearchParams();
    if (typeof args?.limit === "number" && Number.isFinite(args.limit)) params.set("limit", String(args.limit));
    if (args?.outcome) params.set("outcome", args.outcome);
    if (args?.mapped) params.set("mapped", args.mapped);
    const qs = params.toString();
    const path = qs ? `/v1/orchestrator/github/webhook-audit?${qs}` : "/v1/orchestrator/github/webhook-audit";
    return await agentdJson(path, {
      method: "GET",
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      entries: [],
      count: 0,
    };
  }
}

async function orchestratorCiStatusForIpc(args: {
  workflowId: string;
  provider: string;
  status: "queued" | "running" | "passed" | "failed";
  url?: string;
  autoRetry?: boolean;
  repoPath?: string;
  issueId?: string;
  branchName?: string;
  command?: string;
  repoSlug?: string;
  baseBranch?: string;
  prDryRun?: boolean;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/ci/status", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function orchestratorReviewCommentForIpc(args: {
  workflowId: string;
  repoPath: string;
  issueId: string;
  branchName: string;
  comment: string;
  command?: string;
  repoSlug?: string;
  baseBranch?: string;
  prDryRun?: boolean;
}): Promise<any> {
  try {
    return await agentdJson("/v1/orchestrator/review/comment", {
      method: "POST",
      body: args,
      includeLicenseToken: false,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type Risk = "read" | "safe-write" | "high-impact";

function gateProfileCommand(args: {
  projectRoot: string;
  command: string;
  risk: Risk;
  confirmed: boolean;
  confirmationText: string;
}): { ok: true } | { ok: false; message: string } {
  const profile = defaultProfileForProject(args.projectRoot);
  const result = gateCommandRun({
    profile,
    command: args.command,
    risk: args.risk,
    confirmed: args.confirmed,
    confirmationText: args.confirmationText,
  });
  if (!result.ok) {
    return { ok: false, message: `[profile] ${result.message}` };
  }
  return { ok: true };
}

type ToolStep = {
  id: string;
  tool: "terminal";
  command: string;
  risk: Risk;
  description?: string;
};

type AgentPlan = {
  id: string;
  intent: string;
  reasoning: string;
  steps: ToolStep[];
  playbookId?: string;
};

// Playbook definitions with structured diagnostics
type Playbook = {
  id: string;
  name: string;
  description: string;
  category: "diagnose" | "fix" | "security" | "performance" | "cleanup";
  signals: string[];
  interpretationRules: { pattern: RegExp; message: string; severity: "info" | "warning" | "critical" }[];
  gatherCommands: { command: string; description: string; timeout: number }[];
  fixOptions: {
    name: string;
    description: string;
    risk: Risk;
    commands: string[];
    verification: string;
  }[];
  escalationCondition?: string;
};

// Playbook library
const PLAYBOOKS: Playbook[] = [
  {
    id: "running-hot",
    name: "System Running Hot",
    description: "Diagnose and fix CPU/temperature issues",
    category: "performance",
    signals: ["high cpu load", "fan noise", "overheating", "temperature"],
    interpretationRules: [
      { pattern: /load average.*([5-9]\.[0-9]|1[0-9])/, message: "Critical load: system is severely overloaded", severity: "critical" },
      { pattern: /load average.*([2-4]\.[0-9])/, message: "High load: CPU pressure detected", severity: "warning" },
      { pattern: /%Cpu\(s\):.*wa.*([5-9][0-9]\.[0-9])/, message: "High iowait: disk/IO bottleneck", severity: "warning" },
      { pattern: /Processes.*blocked.*[5-9][0-9]+/, message: "Many processes blocked on IO", severity: "warning" }
    ],
    gatherCommands: [
      { command: "uptime", description: "System load average", timeout: 5000 },
      { command: "cat /proc/loadavg", description: "Detailed load stats", timeout: 5000 },
      { command: TOP_CPU_CMD_SAFE.replaceAll("head -15", "head -20"), description: "Top CPU processes", timeout: 8000 },
      { command: "free -h", description: "Memory usage", timeout: 5000 },
      { command: "sensors 2>/dev/null || echo 'No sensors available'", description: "Temperature sensors", timeout: 8000 }
    ],
    fixOptions: [
      {
        name: "Identify CPU hogs",
        description: "Find and analyze processes consuming excessive CPU",
        risk: "read",
        commands: [TOP_CPU_CMD_SAFE],
        verification: "Process list shows CPU consumers"
      },
      {
        name: "Check memory pressure",
        description: "Investigate if memory is causing swap thrashing",
        risk: "read",
        commands: ["free -h", "cat /proc/meminfo | grep -E '(MemAvailable|SwapTotal|SwapFree)'"],
        verification: "Memory statistics available"
      },
      {
        name: "Review system services",
        description: "Check for runaway services",
        risk: "read",
        commands: ["systemctl list-units --type=service --state=running --no-pager -o unit,active,substate | head -20"],
        verification: "Service list available"
      }
    ],
    escalationCondition: "If temperature sensors show critical temperatures (>90°C), advise immediate action"
  },
  {
    id: "disk-full",
    name: "Disk Full",
    description: "Find and clear disk space",
    category: "cleanup",
    signals: ["disk full", "no space", "disk space", "running out of space"],
    interpretationRules: [
      { pattern: /(100%|[9][0-9]%\s)/, message: "Disk is critically full", severity: "critical" },
      { pattern: /([7-8][0-9]%\s)/, message: "Disk is mostly full", severity: "warning" },
      { pattern: /([5-6][0-9]%\s)/, message: "Disk is getting full", severity: "info" }
    ],
    gatherCommands: [
      { command: "df -h | grep -E '(Filesystem|/dev/)'", description: "Disk usage by mount", timeout: 5000 },
      { command: "du -sh /var/* 2>/dev/null | sort -h | tail -10", description: "Largest var directories", timeout: 15000 },
      { command: "du -sh /home/* 2>/dev/null | sort -h | tail -10", description: "Largest home dirs", timeout: 15000 },
      { command: "du -sh ~/.cache 2>/dev/null || echo 'No cache dir'", description: "Cache size", timeout: 10000 },
      { command: "docker system df 2>/dev/null || echo 'Docker not available'", description: "Docker disk usage", timeout: 10000 }
    ],
    fixOptions: [
      {
        name: "Clean apt cache",
        description: "Clear apt package cache",
        risk: "safe-write",
        commands: ["sudo apt autoremove -y", "sudo apt clean"],
        verification: "Apt cache cleaned"
      },
      {
        name: "Clear user cache",
        description: "Clear ~/.cache directory",
        risk: "safe-write",
        commands: ["du -sh ~/.cache 2>/dev/null || echo 'No cache'", "rm -rf ~/.cache/* 2>/dev/null || echo 'Nothing to clear'"],
        verification: "User cache cleared"
      },
      {
        name: "Docker cleanup",
        description: "Clean unused Docker data",
        risk: "high-impact",
        commands: ["docker system df", "docker system prune -f"],
        verification: "Docker disk space freed"
      },
      {
        name: "Find large files",
        description: "Locate largest files for manual review",
        risk: "read",
        commands: ["find /home -type f -size +100M -exec ls -lh {} \\; 2>/dev/null | sort -k5 -h | tail -20"],
        verification: "Large files listed"
      }
    ],
    escalationCondition: "If disk is >95% full, prioritize immediate cleanup actions"
  },
  {
    id: "docker-space",
    name: "Docker Space",
    description: "Clean Docker disk usage",
    category: "cleanup",
    signals: ["docker", "container", "image", "docker-compose"],
    interpretationRules: [
      { pattern: /Images.*([5-9][0-9]+)/, message: "Many unused images", severity: "warning" },
      { pattern: /Containers.*([5-9][0-9]+).*created/, message: "Many stopped containers", severity: "info" },
      { pattern: /Reclaimable.*([5-9][0-9]+%)/, message: "Significant space can be reclaimed", severity: "warning" }
    ],
    gatherCommands: [
      { command: "docker system df", description: "Docker disk usage breakdown", timeout: 10000 },
      { command: "docker system df -v 2>/dev/null | head -30", description: "Detailed Docker stats", timeout: 15000 },
      { command: "docker images -f dangling=true -q | wc -l", description: "Dangling images count", timeout: 5000 },
      { command: "docker ps -a -f status=exited -q | wc -l", description: "Stopped containers count", timeout: 5000 }
    ],
    fixOptions: [
      {
        name: "Docker system prune",
        description: "Remove all unused data (images, containers, volumes)",
        risk: "high-impact",
        commands: ["docker system df", "docker system prune -af"],
        verification: "Docker system pruned"
      },
      {
        name: "Clean dangling images",
        description: "Remove dangling images only",
        risk: "safe-write",
        commands: ["docker image prune -f"],
        verification: "Dangling images removed"
      },
      {
        name: "Remove stopped containers",
        description: "Remove all stopped containers",
        risk: "safe-write",
        commands: ["docker container prune -f"],
        verification: "Stopped containers removed"
      }
    ],
    escalationCondition: "If volumes have important data, ask user before pruning"
  },
  {
    id: "laptop-slow",
    name: "Laptop Slow",
    description: "Diagnose performance issues on laptop",
    category: "performance",
    signals: ["slow", "lag", "performance", "laptop", "freezing"],
    interpretationRules: [
      { pattern: /load average.*([3-9]\.[0-9])/, message: "High system load", severity: "warning" },
      { pattern: /MiB Mem :.*[0-9]+.*[0-9]+.*([0-9]+)%.*/, message: "High memory usage", severity: "warning" },
      { pattern: /battery/i, message: "Check power settings", severity: "info" }
    ],
    gatherCommands: [
      { command: "uptime", description: "Load average", timeout: 5000 },
      { command: "free -h", description: "Memory usage", timeout: 5000 },
      { command: TOP_CPU_CMD_SAFE, description: "Top processes", timeout: 8000 },
      { command: "cat /proc/loadavg", description: "Detailed load", timeout: 5000 },
      { command: "systemctl status 2>/dev/null | head -20", description: "Systemd status", timeout: 10000 }
    ],
    fixOptions: [
      {
        name: "Check for memory hogs",
        description: "Find processes using most memory",
        risk: "read",
        commands: [TOP_MEM_CMD_SAFE],
        verification: "Memory hogs identified"
      },
      {
        name: "Review running services",
        description: "Check for unnecessary services",
        risk: "read",
        commands: ["systemctl list-units --type=service --state=running --no-pager | wc -l", "systemctl list-units --type=service --state=running --no-pager"],
        verification: "Service list available"
      }
    ],
    escalationCondition: "If memory usage >90%, suggest closing applications or adding RAM"
  },
  {
    id: "port-in-use",
    name: "Port In Use",
    description: "Diagnose and resolve port conflicts",
    category: "diagnose",
    signals: ["port", "address already in use", "eaddrinuse", "bind failed"],
    interpretationRules: [
      { pattern: /:([0-9]+)\s+.*already in use/i, message: "Port is occupied", severity: "warning" },
      { pattern: /EADDRINUSE/i, message: "Address already in use", severity: "warning" }
    ],
    gatherCommands: [
      { command: "ss -tlnp | grep -E ':[0-9]+'", description: "Listening ports", timeout: 5000 },
      { command: "lsof -i :PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep PORT", description: "Process on specific port", timeout: 5000 },
      { command: "ps aux | grep -E 'node|python|go|java|ruby' | grep -v grep", description: "Common dev processes", timeout: 8000 }
    ],
    fixOptions: [
      {
        name: "Find process on port",
        description: "Identify what's using the port",
        risk: "read",
        commands: ["lsof -i :PORT 2>/dev/null || ss -tlnp | grep PORT"],
        verification: "Process identified"
      },
      {
        name: "Kill process on port",
        description: "Terminate process using the port (careful!)",
        risk: "high-impact",
        commands: ["kill $(lsof -t -i:PORT) 2>/dev/null || echo 'Could not identify process'"],
        verification: "Process terminated"
      }
    ],
    escalationCondition: "If process belongs to critical service, advise caution"
  }
];

// Session transcript types
type TranscriptEntry =
  | { type: "intent"; timestamp: string; intent: string }
  | { type: "playbook"; timestamp: string; playbookId: string; playbookName: string }
  | { type: "plan"; timestamp: string; plan: AgentPlan }
  | { type: "signal"; timestamp: string; signal: string; interpretation: string }
  | { type: "approval"; timestamp: string; stepId: string; command: string; risk: Risk; approved: boolean }
  | { type: "execution_start"; timestamp: string; streamId: string; stepId: string; command: string }
  | { type: "execution_end"; timestamp: string; streamId: string; ok: boolean; error?: string }
  | { type: "verification"; timestamp: string; check: string; result: string; status: "passed" | "failed" | "warning" }
  | { type: "outcome"; timestamp: string; rootCause: string; changes: string[]; evidenceBefore: string; evidenceAfter: string; confidence: "high" | "medium" | "low" }
  | { type: "memory"; timestamp: string; category: string; key: string; value: string };

// Operational memory (local storage for successful fixes)
const operationalMemory = {
  storage: new Map<string, Map<string, any>>(),
  
  get(category: string, key: string): any {
    return this.storage.get(category)?.get(key);
  },
  
  set(category: string, key: string, value: any): void {
    if (!this.storage.has(category)) {
      this.storage.set(category, new Map());
    }
    this.storage.get(category)!.set(key, {
      value,
      timestamp: Date.now(),
      successCount: (this.get(category, key)?.successCount || 0) + 1
    });
  },
  
  getRecent(category: string, limit = 5): any[] {
    const items = this.storage.get(category);
    if (!items) return [];
    return Array.from(items.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
};

// Session state
const sessionState = {
  id: `session_${Date.now()}`,
  startTime: new Date().toISOString(),
  entries: [] as TranscriptEntry[],
  playbookResults: new Map<string, { before: string; after: string }>()
};

function withStructuredSessionWrite(fn: () => void): void {
  if (!structuredSessionStore) return;
  try {
    fn();
  } catch {
    // Shadow-write path must never break runtime execution.
  }
}

function ensureStructuredSession(args: { source: string; projectRoot?: string; preferredId?: string }): string | null {
  if (!structuredSessionStore) return null;
  try {
    return structuredSessionStore.startSession(args);
  } catch {
    return null;
  }
}

function sanitizeForPersistence<T>(value: T): T {
  if (typeof value === "string") {
    return redactText(value).redactedText as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForPersistence(v)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForPersistence(v);
    }
    return out as T;
  }
  return value;
}

function addTranscriptEntry(entry: TranscriptEntry) {
  sessionState.entries.push(sanitizeForPersistence(entry));
}

function getSessionTranscript() {
  return {
    sessionId: sessionState.id,
    startTime: sessionState.startTime,
    endTime: new Date().toISOString(),
    entries: sessionState.entries,
    playbookResults: Object.fromEntries(sessionState.playbookResults)
  };
}

function exportTranscript(format: "json" | "text"): string {
  const transcript = getSessionTranscript();
  
  if (format === "json") {
    return redactText(JSON.stringify(transcript, null, 2)).redactedText;
  }
  
  let text = `RinaWarp Session Report\n`;
  text += `${"=".repeat(50)}\n`;
  text += `Session: ${transcript.sessionId}\n`;
  text += `Started: ${transcript.startTime}\n`;
  text += `Ended: ${transcript.endTime}\n\n`;
  
  let stepNum = 0;
  for (const entry of transcript.entries) {
    switch (entry.type) {
      case "intent":
        text += `\n## Intent\n${entry.intent}\n`;
        break;
      case "playbook":
        text += `\n## Playbook: ${entry.playbookName}\n`;
        break;
      case "signal":
        text += `\n## Signal Detected\n${entry.signal}\n→ ${entry.interpretation}\n`;
        break;
      case "plan":
        text += `\n## Plan\n${entry.plan.reasoning}\n\n`;
        entry.plan.steps.forEach((s: any, i: number) => {
          text += `${i + 1}. [${s.risk}] ${s.command}\n`;
        });
        break;
      case "approval":
        text += `\n## Approval: ${entry.stepId}\n`;
        text += `Command: ${entry.command}\n`;
        text += `Risk: ${entry.risk}\n`;
        text += `Approved: ${entry.approved ? "Yes" : "No"}\n`;
        break;
      case "execution_start":
        stepNum++;
        text += `\n## Step ${stepNum}: ${entry.command}\n`;
        break;
      case "execution_end":
        text += `Result: ${entry.ok ? "Success" : "Failed: " + (entry.error || "unknown")}\n`;
        break;
      case "verification":
        text += `\n## Verification: ${entry.check}\n`;
        text += `Status: ${entry.status.toUpperCase()}\n`;
        text += `Result: ${entry.result}\n`;
        break;
      case "outcome":
        text += `\n## OUTCOME CARD\n`;
        text += `Root Cause: ${entry.rootCause}\n`;
        text += `Changes: ${entry.changes.join(", ")}\n`;
        text += `Confidence: ${entry.confidence.toUpperCase()}\n`;
        text += `\nEvidence Before:\n${entry.evidenceBefore}\n`;
        text += `\nEvidence After:\n${entry.evidenceAfter}\n`;
        break;
      case "memory":
        text += `\n## Memory Stored\nCategory: ${entry.category}\nKey: ${entry.key}\n`;
        break;
    }
  }
  
  return redactText(text).redactedText;
}

type UnifiedSearchSource = "structured" | "transcript" | "share";
type UnifiedSearchHit = {
  id: string;
  source: UnifiedSearchSource;
  label: string;
  meta: string;
  snippet?: string;
  command?: string;
  shareId?: string;
  createdAt: string;
  score: number;
};

function recencyBoost(iso: string): number {
  const ts = Date.parse(String(iso || ""));
  if (!Number.isFinite(ts)) return 0;
  const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
  if (ageHours <= 1) return 2;
  if (ageHours <= 24) return 1;
  if (ageHours <= 24 * 7) return 0.5;
  return 0;
}

function searchTranscriptEntries(query: string, limit: number): UnifiedSearchHit[] {
  const out: UnifiedSearchHit[] = [];
  const q = String(query || "").trim();
  const entries = sessionState.entries.slice(-500).reverse();
  for (const entry of entries) {
    let label = "";
    let meta = `transcript • ${entry.type}`;
    let haystack = "";
    let command: string | undefined;

    if (entry.type === "execution_start") {
      label = entry.command;
      command = entry.command;
      meta = `transcript • command • ${entry.stepId}`;
      haystack = `${entry.command} ${entry.stepId}`;
    } else if (entry.type === "intent") {
      label = entry.intent;
      haystack = entry.intent;
      meta = "transcript • intent";
    } else if (entry.type === "signal") {
      label = entry.signal;
      haystack = `${entry.signal} ${entry.interpretation}`;
      meta = "transcript • signal";
    } else if (entry.type === "verification") {
      label = `${entry.check}: ${entry.status}`;
      haystack = `${entry.check} ${entry.result} ${entry.status}`;
      meta = "transcript • verification";
    } else if (entry.type === "outcome") {
      label = `Outcome: ${entry.rootCause}`;
      haystack = `${entry.rootCause} ${entry.changes.join(" ")} ${entry.evidenceBefore} ${entry.evidenceAfter}`;
      meta = `transcript • outcome • ${entry.confidence}`;
    } else if (entry.type === "playbook") {
      label = entry.playbookName;
      haystack = `${entry.playbookName} ${entry.playbookId}`;
      meta = "transcript • playbook";
    } else if (entry.type === "approval") {
      label = entry.command;
      command = entry.command;
      haystack = `${entry.command} ${entry.risk} ${entry.approved ? "approved" : "denied"}`;
      meta = `transcript • approval • ${entry.risk}`;
    } else if (entry.type === "memory") {
      label = `${entry.category}: ${entry.key}`;
      haystack = `${entry.category} ${entry.key} ${entry.value}`;
      meta = "transcript • memory";
    } else if (entry.type === "execution_end") {
      label = entry.ok ? "Execution success" : `Execution failed: ${entry.error || "unknown"}`;
      haystack = `${entry.error || ""} ${entry.ok ? "success" : "failed"}`;
      meta = "transcript • execution end";
    } else if (entry.type === "plan") {
      label = entry.plan.intent || entry.plan.reasoning;
      haystack = `${entry.plan.intent} ${entry.plan.reasoning} ${(entry.plan.steps || []).map((s) => s.command).join(" ")}`;
      meta = "transcript • plan";
    }

    if (!label) continue;
    const score = scoreTextMatch(q, haystack);
    if (q && score < 0) continue;
    const total = (score > 0 ? score : 0.05) + recencyBoost(entry.timestamp);
    out.push({
      id: `transcript:${entry.timestamp}:${entry.type}:${out.length}`,
      source: "transcript",
      label,
      meta,
      snippet: haystack.slice(0, 220),
      command,
      createdAt: entry.timestamp,
      score: Number(total.toFixed(4)),
    });
    if (out.length >= Math.max(5, limit * 2)) break;
  }
  return out;
}

function searchShareRecords(query: string, limit: number): UnifiedSearchHit[] {
  const out: UnifiedSearchHit[] = [];
  const q = String(query || "").trim();
  const role = getCurrentRole();
  const shares = loadSharesDb().shares
    .filter((s) => hasRoleAtLeast(role, s.requiredRole))
    .slice(0, 250);
  for (const s of shares) {
    const label = s.title || `Share ${s.id}`;
    const summary = `${label}\n${s.content || ""}`;
    const score = scoreTextMatch(q, summary);
    if (q && score < 0) continue;
    const status = s.revoked ? "revoked" : (Date.now() > Date.parse(s.expiresAt) ? "expired" : "active");
    const total = (score > 0 ? score : 0.05) + recencyBoost(s.createdAt);
    out.push({
      id: `share:${s.id}`,
      source: "share",
      label,
      meta: `share • ${status} • ${s.requiredRole}`,
      snippet: String(s.content || "").slice(0, 220),
      shareId: s.id,
      createdAt: s.createdAt,
      score: Number(total.toFixed(4)),
    });
    if (out.length >= Math.max(5, limit * 2)) break;
  }
  return out;
}

function searchStructuredRecords(query: string, limit: number): UnifiedSearchHit[] {
  if (!structuredSessionStore) return [];
  const hits = structuredSessionStore.searchCommands(String(query || ""), Math.max(10, limit * 2));
  return hits.map((h) => {
    const status = h.ok === true ? "ok" : h.ok === false ? "failed" : "unknown";
    const meta = `structured • ${status} • ${h.risk || "read"} • ${h.cwd || "(default)"}`;
    const total = Number((h.score + recencyBoost(h.startedAt)).toFixed(4));
    return {
      id: `structured:${h.commandId}`,
      source: "structured",
      label: h.command,
      meta,
      snippet: h.snippet,
      command: h.command,
      createdAt: h.startedAt,
      score: total,
    } as UnifiedSearchHit;
  });
}

function runUnifiedSearch(query: string, limit = 20): UnifiedSearchHit[] {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
  const sourceBoost: Record<UnifiedSearchSource, number> = {
    structured: 0.9,
    transcript: 0.45,
    share: 0.25,
  };
  const all = [
    ...searchStructuredRecords(query, safeLimit),
    ...searchTranscriptEntries(query, safeLimit),
    ...searchShareRecords(query, safeLimit),
  ].map((h) => ({
    ...h,
    score: Number((h.score + (sourceBoost[h.source] || 0)).toFixed(4)),
  }));
  return all
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .slice(0, safeLimit);
}

/**
 * Secure environment filtering - prevents credential bleed into agent execution
 */
function safeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const BLOCKED = [
    "AWS_SECRET_ACCESS_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "DATABASE_URL",
    "CF_API_TOKEN",
    "NPM_TOKEN",
    "GITHUB_TOKEN",
    "SESSION_SECRET",
    "DOWNLOAD_TOKEN_SECRET"
  ];

  const filtered: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(env)) {
    if (!BLOCKED.includes(k) && v !== undefined) filtered[k] = v;
  }
  return filtered;
}

/**
 * Split command into executable and arguments (prevents shell injection)
 */
function splitCommand(cmd: string): { file: string; args: string[] } {
  const parts = cmd.trim().split(/\s+/);
  return { file: parts[0], args: parts.slice(1) };
}

// =======================================================
// STREAMING STATE (ENGINE-BACKED + VALIDATED)
// =======================================================

type StreamInfo = {
  cancelled: boolean;
  stepId: string;
  command: string;
};

const running = new Map<string, StreamInfo>();
const ptyStreamOwners = new Map<string, number>();

type PtyProcess = {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(listener: (data: string) => void): void;
  onExit(listener: (event: { exitCode: number; signal?: number }) => void): void;
};

type PtyModule = {
  spawn(
    file: string,
    args: string[],
    options: {
      name: string;
      cols: number;
      rows: number;
      cwd: string;
      env: NodeJS.ProcessEnv;
    },
  ): PtyProcess;
};

type PtySession = {
  proc: PtyProcess;
  cols: number;
  rows: number;
  cwd: string;
  shell: string;
  shellKind: ShellKind;
  transcriptBuffer: string;
  finalizedBoundaryCount: number;
  pendingInput: string;
  metrics: {
    startedAt: string;
    bytesIn: number;
    bytesOut: number;
    resizeCount: number;
    blockedCommands: number;
  };
};

const ptySessions = new Map<number, PtySession>();
const ptyResizeTimers = new Map<number, NodeJS.Timeout>();
let ptyModulePromise: Promise<PtyModule | null> | null = null;
const SHARES_FILE = () => path.join(app.getPath("userData"), "shares.json");
const TEAM_FILE = () => path.join(app.getPath("userData"), "team-workspace.json");
const TEAM_INVITES_FILE = () => path.join(app.getPath("userData"), "team-invites.json");
const TEAM_ACTIVITY_FILE = () => path.join(app.getPath("userData"), "team-activity.ndjson");
const RENDERER_ERRORS_FILE = () => path.join(app.getPath("userData"), "renderer-errors.ndjson");

type Role = "owner" | "operator" | "viewer";
type ShareRecord = {
  id: string;
  createdAt: string;
  createdBy: string;
  title?: string;
  content: string;
  revoked: boolean;
  expiresAt: string;
  requiredRole: Role;
};
type SharesDb = { shares: ShareRecord[] };
type TeamDb = {
  currentUser?: string;
  members: Array<{ email: string; role: Role }>;
};
type TeamActivityAction =
  | "share_created"
  | "share_revoked"
  | "share_accessed"
  | "share_access_denied"
  | "invite_created"
  | "invite_revoked"
  | "invite_accepted"
  | "member_upserted"
  | "member_removed"
  | "current_user_changed";
type TeamActivityRecord = {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: Role;
  action: TeamActivityAction;
  target: string;
  details?: Record<string, string | number | boolean | null>;
};
type TeamInviteRecord = {
  id: string;
  token: string;
  email: string;
  role: Role;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  acceptedAt?: string;
  acceptedBy?: string;
};
type TeamInvitesDb = {
  invites: TeamInviteRecord[];
};
type SharePreviewRecord = {
  id: string;
  createdAtMs: number;
  expiresAtMs: number;
  createdBy: string;
  redactedContent: string;
  redactionCount: number;
  contentHash: string;
};
type ExportPreviewKind = "runbook_markdown" | "audit_json";
type ExportPreviewRecord = {
  id: string;
  kind: ExportPreviewKind;
  createdAtMs: number;
  expiresAtMs: number;
  createdBy: string;
  payload: string;
  mime: string;
  fileName: string;
  redactionCount: number;
  contentHash: string;
};

const sharePreviewTokens = new Map<string, SharePreviewRecord>();
const SHARE_PREVIEW_TTL_MS = 15 * 60 * 1000;
const exportPreviewTokens = new Map<string, ExportPreviewRecord>();
const EXPORT_PREVIEW_TTL_MS = 15 * 60 * 1000;
const REDACT_BEFORE_PERSIST = true;
const REDACT_BEFORE_MODEL = true;

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function newSharePreviewId(): string {
  return `shp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function newExportPreviewId(): string {
  return `exp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function pruneSharePreviewTokens(now = Date.now()) {
  for (const [id, rec] of sharePreviewTokens.entries()) {
    if (rec.expiresAtMs <= now) sharePreviewTokens.delete(id);
  }
}

function pruneExportPreviewTokens(now = Date.now()) {
  for (const [id, rec] of exportPreviewTokens.entries()) {
    if (rec.expiresAtMs <= now) exportPreviewTokens.delete(id);
  }
}

function buildAuditExportText(): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    policyEnv: currentPolicyEnv(),
    role: getCurrentRole(),
    transcript: getSessionTranscript(),
    shares: loadSharesDb().shares.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      createdBy: s.createdBy,
      title: s.title,
      revoked: s.revoked,
      expiresAt: s.expiresAt,
      requiredRole: s.requiredRole,
    })),
    team: loadTeamDb(),
    teamInvites: loadTeamInvitesDb().invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      createdAt: inv.createdAt,
      createdBy: inv.createdBy,
      expiresAt: inv.expiresAt,
      status: inv.status,
      acceptedAt: inv.acceptedAt || null,
      acceptedBy: inv.acceptedBy || null,
    })),
    teamActivity: loadTeamActivity(1000),
  };
  return redactText(JSON.stringify(payload, null, 2)).redactedText;
}

function redactChunkIfNeeded(text: string): string {
  if (!REDACT_BEFORE_PERSIST) return String(text ?? "");
  return redactText(String(text ?? "")).redactedText;
}

function forRendererDisplay(text: string): string {
  return String(text ?? "");
}

function redactForModel(text: string): string {
  if (!REDACT_BEFORE_MODEL) return String(text ?? "");
  return redactText(String(text ?? "")).redactedText;
}

function getPtyModule(): Promise<PtyModule | null> {
  if (!ptyModulePromise) {
    ptyModulePromise = import("node-pty")
      .then((mod) => mod as unknown as PtyModule)
      .catch(() => null);
  }
  return ptyModulePromise;
}

function getDefaultShell(): string {
  if (process.platform === "win32") return process.env.COMSPEC || "cmd.exe";
  return process.env.SHELL || "/bin/bash";
}

function getDefaultPtyCwd(): string {
  return process.env.HOME || process.cwd();
}

function resolvePtyCwd(input?: string): string {
  if (!input || !input.trim()) return getDefaultPtyCwd();
  try {
    return normalizeProjectRoot(input);
  } catch {
    return getDefaultPtyCwd();
  }
}

const CODE_EXPLORER_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "dist-electron",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
]);

function listProjectFilesSafe(projectRoot: string, limit = 800): string[] {
  const safeRoot = normalizeProjectRoot(projectRoot);
  const out: string[] = [];
  const max = Math.max(50, Math.min(Number(limit || 800), 5000));
  const stack: string[] = [safeRoot];

  while (stack.length > 0 && out.length < max) {
    const dir = stack.pop() as string;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) {
        if (![".env.example", ".env.local.example"].includes(ent.name)) continue;
      }
      const full = path.join(dir, ent.name);
      if (!isWithinRoot(full, safeRoot)) continue;
      if (ent.isDirectory()) {
        if (CODE_EXPLORER_SKIP_DIRS.has(ent.name)) continue;
        stack.push(full);
        continue;
      }
      if (!ent.isFile()) continue;
      out.push(path.relative(safeRoot, full));
      if (out.length >= max) break;
    }
  }

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function readProjectFileSafe(args: { projectRoot: string; relativePath: string; maxBytes?: number }): {
  ok: boolean;
  content?: string;
  truncated?: boolean;
  error?: string;
} {
  const safeRoot = normalizeProjectRoot(args.projectRoot);
  const rel = String(args.relativePath || "").replace(/\\/g, "/").trim();
  if (!rel || rel.includes("\0")) return { ok: false, error: "Invalid file path" };
  const full = canonicalizePath(path.resolve(safeRoot, rel));
  if (!isWithinRoot(full, safeRoot)) return { ok: false, error: "File is outside workspace root" };
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return { ok: false, error: "File not found" };

  const max = Math.max(1024, Math.min(Number(args.maxBytes || 120_000), 2_000_000));
  const buf = fs.readFileSync(full);
  const raw = buf.subarray(0, max);
  const content = raw.toString("utf8");
  const looksBinary = content.includes("\u0000");
  if (looksBinary) {
    return {
      ok: true,
      content: "[binary file preview not available]",
      truncated: buf.length > max,
    };
  }
  return {
    ok: true,
    content,
    truncated: buf.length > max,
  };
}

function shellToKind(shell: string): ShellKind {
  const s = path.basename(String(shell || "")).toLowerCase();
  if (s.includes("pwsh") || s.includes("powershell")) return "pwsh";
  if (s.includes("fish")) return "fish";
  if (s.includes("zsh")) return "zsh";
  if (s.includes("bash")) return "bash";
  return "unknown";
}

function finalizePtyBoundaries(webContents: Electron.WebContents, session: PtySession, flushAll = false) {
  const boundaries = detectCommandBoundaries(session.transcriptBuffer, session.shellKind);
  if (!boundaries.length) return;
  const limit = flushAll ? boundaries.length : Math.max(0, boundaries.length - 1);
  if (session.finalizedBoundaryCount >= limit) return;
  for (let i = session.finalizedBoundaryCount; i < limit; i += 1) {
    const b = boundaries[i];
    const command = String(b.command || "").trim();
    if (!command) continue;
    const streamId = createStableBoundaryStreamId(webContents.id, i);
    ptyStreamOwners.set(streamId, webContents.id);
    const sid = ensureStructuredSession({ source: "pty_live_capture", projectRoot: session.cwd });
    withStructuredSessionWrite(() => {
      structuredSessionStore?.beginCommand({
        sessionId: sid || undefined,
        streamId,
        command,
        cwd: session.cwd,
        risk: "read",
        source: "pty_live_capture",
      });
      structuredSessionStore?.appendChunk(streamId, "meta", redactChunkIfNeeded(`$ ${command}\n`));
      if (b.output) structuredSessionStore?.appendChunk(streamId, "stdout", redactChunkIfNeeded(b.output));
      structuredSessionStore?.endCommand({
        streamId,
        ok: true,
        code: null,
        cancelled: false,
      });
    });
    addTranscriptEntry({
      type: "execution_start",
      timestamp: new Date().toISOString(),
      streamId,
      stepId: `pty_${i + 1}`,
      command,
    });
    addTranscriptEntry({
      type: "execution_end",
      timestamp: new Date().toISOString(),
      streamId,
      ok: true,
    });
  }
  session.finalizedBoundaryCount = limit;
  if (session.transcriptBuffer.length > 500_000) {
    session.transcriptBuffer = session.transcriptBuffer.slice(-300_000);
    session.finalizedBoundaryCount = 0;
  }
  safeSend(webContents, "rina:pty:boundaryStats", {
    captured: session.finalizedBoundaryCount,
    shell: session.shellKind,
  });
}

function closePtyForWebContents(webContentsId: number): void {
  const timer = ptyResizeTimers.get(webContentsId);
  if (timer) {
    clearTimeout(timer);
    ptyResizeTimers.delete(webContentsId);
  }
  const session = ptySessions.get(webContentsId);
  if (!session) return;
  try {
    session.proc.kill();
  } catch {
    // no-op
  }
  for (const [streamId, ownerId] of ptyStreamOwners.entries()) {
    if (ownerId === webContentsId) ptyStreamOwners.delete(streamId);
  }
  ptySessions.delete(webContentsId);
}

function createStreamId(): string {
  return `st_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createStableBoundaryStreamId(webContentsId: number, index: number): string {
  return `pty_${webContentsId}_${index}_${Math.random().toString(16).slice(2, 10)}`;
}

async function diagnoseHotLinux(): Promise<{
  platform: string;
  cpuModel: string;
  cpuCores: number;
  loadavg: number[];
  mem: { totalBytes: number; freeBytes: number };
  topProcesses: string;
  sensors: string;
}> {
  const cpus = os.cpus();
  const loadavg = os.loadavg?.() ?? [];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  const topProcesses = await runCommandOnce(
    TOP_CPU_CMD_SAFE.replace("head -15", "head -n 15"),
    8000
  ).catch((e) => `Unable to read processes: ${String(e)}`);

  const sensors = await runCommandOnce("sensors", 8000).catch(
    () => "No `sensors` output."
  );

  return {
    platform: process.platform,
    cpuModel: cpus?.[0]?.model ?? "unknown",
    cpuCores: cpus?.length ?? 0,
    loadavg,
    mem: { totalBytes: totalMem, freeBytes: freeMem },
    topProcesses,
    sensors
  };
}

/**
 * Run a command once via the engine (non-streaming, for diagnostics).
 * Used for internal diagnostics like diagnoseHotLinux.
 */
async function runCommandOnceViaEngine(command: string, timeoutMs: number): Promise<string> {
  const plan = [
    {
      tool: "terminal.write",
      input: {
        command,
        cwd: process.cwd(),
        timeoutMs,
        stepId: "diagnostic",
      },
      stepId: "diagnostic",
      description: `Diagnostic command: ${command}`,
      risk_level: "low" as const,
      requires_confirmation: false,
      verification_plan: { steps: [] as Array<{ tool: string; input: unknown }> },
    },
  ];

  const report = await executeViaEngine({
    engine,
    plan,
    projectRoot: process.cwd(),
    license: currentLicenseTier,
  });

  const result = report.steps[0]?.result;
  if (!result?.success) {
    throw new Error(result?.error ?? "Command failed");
  }
  return result.output ?? "";
}

function runCommandOnce(command: string, timeoutMs: number): Promise<string> {
  // For diagnostics, prefer engine-backed execution for consistency
  return runCommandOnceViaEngine(command, timeoutMs);
}

function runGatherCommand(cmd: { command: string; description: string; timeout: number }): Promise<{ description: string; output: string }> {
  return new Promise(async (resolve) => {
    try {
      const output = await runCommandOnce(cmd.command, cmd.timeout);
      resolve({ description: cmd.description, output: output || "(no output)" });
    } catch (e) {
      resolve({ description: cmd.description, output: `Error: ${String(e)}` });
    }
  });
}

function makePlan(intentRaw: string, projectRoot?: string): AgentPlan {
  const intent = (intentRaw || "").trim().toLowerCase();
  const id = `plan_${Date.now()}`;

  // Detect build kind for ecosystem-aware plans
  const buildKind = projectRoot ? detectBuildKind(projectRoot) : "unknown";

  // Match playbook based on signals
  for (const playbook of PLAYBOOKS) {
    if (playbook.signals.some(s => intent.includes(s))) {
      const steps: ToolStep[] = playbook.gatherCommands.map((cmd, i) => ({
        id: `s${i + 1}`,
        tool: "terminal",
        command: cmd.command,
        risk: "read",
        description: cmd.description
      }));

      return {
        id,
        intent: intentRaw,
        reasoning: playbook.description,
        steps,
        playbookId: playbook.id
      };
    }
  }

  // Ecosystem-aware build/diagnostic plan
  if (intent.includes("build") || intent.includes("broken") || intent.includes("fix")) {
    const steps = buildStepsForKind(buildKind, projectRoot);
    if (steps.length > 0) {
      return {
        id,
        intent: intentRaw,
        reasoning: `Detected ${buildKind} project. I'll run the build workflow to diagnose and fix issues.`,
        steps,
      };
    }
  }

  // Default plan
  return {
    id,
    intent: intentRaw,
    reasoning: "I'll run diagnostics to understand what's happening.",
    steps: [
      { id: "s1", tool: "terminal", command: "uptime", risk: "read" },
      { id: "s2", tool: "terminal", command: "free -h", risk: "read" },
      { id: "s3", tool: "terminal", command: TOP_CPU_CMD_SAFE_SHORT, risk: "read" }
    ]
  };
}

/**
 * Detect project type based on files in projectRoot
 */
function detectBuildKind(projectRoot: string): "node" | "python" | "rust" | "go" | "unknown" {
  const has = (p: string) => fs.existsSync(path.join(projectRoot, p));
  if (has("package.json")) return "node";
  if (has("pyproject.toml") || has("requirements.txt")) return "python";
  if (has("Cargo.toml")) return "rust";
  if (has("go.mod")) return "go";
  return "unknown";
}

/**
 * Generate build steps based on project type
 */
function buildStepsForKind(kind: string, projectRoot?: string): ToolStep[] {
  const cwd = projectRoot || ".";
  
  switch (kind) {
    case "node":
      return [
        { id: "node_version", tool: "terminal", command: "node -v", risk: "read" },
        { id: "npm_version", tool: "terminal", command: "npm -v", risk: "read" },
        { id: "install", tool: "terminal", command: "npm ci", risk: "safe-write", description: "Install dependencies" },
        { id: "build", tool: "terminal", command: "npm run build", risk: "safe-write", description: "Build project" },
      ];
    case "python":
      return [
        { id: "py_version", tool: "terminal", command: "python -V", risk: "read" },
        { id: "pip_version", tool: "terminal", command: "pip -V", risk: "read" },
        { id: "install", tool: "terminal", command: "pip install -r requirements.txt", risk: "safe-write", description: "Install dependencies" },
        { id: "test", tool: "terminal", command: "pytest -q", risk: "read", description: "Run tests" },
      ];
    case "rust":
      return [
        { id: "rust_version", tool: "terminal", command: "rustc -V", risk: "read" },
        { id: "build", tool: "terminal", command: "cargo build", risk: "safe-write", description: "Build project" },
        { id: "test", tool: "terminal", command: "cargo test", risk: "read", description: "Run tests" },
      ];
    case "go":
      return [
        { id: "go_version", tool: "terminal", command: "go version", risk: "read" },
        { id: "test", tool: "terminal", command: "go test ./...", risk: "read", description: "Run tests" },
      ];
    default:
      return [
        { id: "git_status", tool: "terminal", command: "git status", risk: "read" },
        { id: "list_files", tool: "terminal", command: "ls -la", risk: "read" },
      ];
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const webContentsId = win.webContents.id;
  win.loadFile(path.join(__dirname, "renderer.html"));
  win.once("closed", () => {
    try {
      closePtyForWebContents(webContentsId);
    } catch {
      // Ignore teardown races during window shutdown.
    }
  });

  // Keep DevTools closed by default in packaged builds unless explicitly toggled.
  if (app.isPackaged) {
    try {
      if (!win.webContents.isDestroyed()) {
        win.webContents.closeDevTools();
      }
    } catch {
      // Ignore if webContents is already gone while closing.
    }
  }
}

async function devtoolsToggleForIpc(wc: WebContents) {
  if (wc.isDestroyed()) return { ok: false, error: "window destroyed" };
  try {
    if (wc.isDevToolsOpened()) {
      wc.closeDevTools();
      return { ok: true, open: false };
    }
    wc.openDevTools({ mode: "detach" });
    return { ok: true, open: true };
  } catch (err) {
    return { ok: false, error: (err && (err as Error).message) ? (err as Error).message : "failed to toggle devtools" };
  }
}

/**
 * Create confirmation scope for high-impact steps.
 * Stable + explicit; renderer shows this exact scope.
 */
function createConfirmationScope(step: ToolStep): string {
  return `terminal.write:${step.command}`;
}

/**
 * Engine-backed streaming command execution.
 * Replaces direct spawn() calls with engine-mediated execution.
 * Validates projectRoot before execution to prevent path traversal.
 */
async function startStreamingStepViaEngine(args: {
  webContents: WebContents;
  streamId: string;
  step: ToolStep;
  confirmed: boolean;
  confirmationText: string;
  projectRoot: string;
}): Promise<{ ok: boolean; cancelled: boolean; error?: string | null }> {
  const { webContents, streamId, step, confirmed, confirmationText, projectRoot: rawProjectRoot } = args;
  
  // SECURITY: Validate and normalize projectRoot
  const projectRoot = normalizeProjectRoot(rawProjectRoot);
  
  // Source-of-truth risk (avoid drift from classifier vs step.risk)
  const risk = step.risk;
  const profileGate = gateProfileCommand({
    projectRoot,
    command: step.command,
    risk,
    confirmed,
    confirmationText,
  });
  if (!profileGate.ok) {
    const error = profileGate.message;
    safeSend(webContents, "rina:stream:end", {
      streamId,
      ok: false,
      code: null,
      error,
    });
    return { ok: false, cancelled: false, error };
  }
  const sessionId = ensureStructuredSession({
    source: "engine_step_stream",
    projectRoot,
  });
  withStructuredSessionWrite(() => {
    structuredSessionStore?.beginCommand({
      sessionId: sessionId || undefined,
      streamId,
      command: step.command,
      cwd: projectRoot,
      risk,
      source: "engine_step_stream",
    });
  });

  const policyGate = evaluatePolicyGate(step.command, confirmed, confirmationText);
  if (!policyGate.ok) {
    const error = policyGate.message || "Blocked by policy.";
    safeSend(webContents, "rina:stream:end", {
      streamId,
      ok: false,
      code: null,
      error,
    });
    withStructuredSessionWrite(() => {
      structuredSessionStore?.endCommand({
        streamId,
        ok: false,
        code: null,
        cancelled: false,
        error,
      });
    });
    return { ok: false, cancelled: false, error };
  }

  // 1) High-impact confirmation gate (keeps your UX contract)
  let confirmationToken: ConfirmationToken | undefined;
  if (risk === "high-impact") {
    if (!confirmed) {
      const error = "Confirmation required for high-impact step.";
      safeSend(webContents, "rina:stream:end", {
        streamId,
        ok: false,
        code: null,
        error,
      });
      return { ok: false, cancelled: false, error };
    }

    const scope = createConfirmationScope(step);
    confirmationToken = { kind: "explicit", approved: true, scope };
  }

  // 2) Send command meta (unchanged)
  safeSend(webContents, "rina:stream:chunk", {
    streamId,
    stream: "meta",
    data: `$ ${step.command}\n`,
  });
  withStructuredSessionWrite(() => {
    structuredSessionStore?.appendChunk(streamId, "meta", redactChunkIfNeeded(`$ ${step.command}\n`));
  });

  // 3) Track stream
  running.set(streamId, {
    cancelled: false,
    stepId: step.id,
    command: step.command,
  });

  // 4) Build plan (single step)
  const plan = [
    {
      tool: "terminal.write",
      input: {
        command: step.command,
        cwd: projectRoot,
        timeoutMs: 60_000,
        stepId: step.id,
      },
      stepId: step.id,
      description: step.description ?? `Execute command: ${step.command}`,
      risk_level: toRiskLevel(risk),
      requires_confirmation: risk === "high-impact",
      verification_plan: { steps: [] as Array<{ tool: string; input: unknown }> },
      ...(risk === "high-impact" ? { confirmationScope: createConfirmationScope(step) } : {}),
    },
  ];

  // 5) Execute through engine with streaming emit
  const report = await executeViaEngine({
    engine,
    plan,
    projectRoot,
    license: currentLicenseTier,
    confirmationToken,
    emit: (evt: ToolEvent) => {
      const info = running.get(streamId);
      if (!info) return;

      // Soft cancel: stop emitting when cancelled
      if (info.cancelled) return;

      if (evt.type === "chunk") {
        safeSend(webContents, "rina:stream:chunk", {
          streamId,
          stream: evt.stream,
          data: forRendererDisplay(evt.data),
        });
        withStructuredSessionWrite(() => {
          const mapped = evt.stream === "stderr" ? "stderr" : "stdout";
          structuredSessionStore?.appendChunk(streamId, mapped, redactChunkIfNeeded(String(evt.data || "")));
        });
      }
    },
  });

  // 6) Finish - robust completion handling
  const info = running.get(streamId);
  const cancelled = info?.cancelled ?? false;
  running.delete(streamId);

  // Use last step result (handles early halts/confirmation_required)
  const lastStep = report.steps.at(-1);
  const lastResult = lastStep?.result;
  
  const exitCode = (lastResult?.meta as Record<string, unknown> | undefined)?.exitCode ?? null;
  
  const error = cancelled
    ? "Cancelled by user."
    : report.ok
      ? null
      : (lastResult && !lastResult.success
          ? (lastResult.error ?? "Execution failed")
          : (report.haltedBecause ?? "Execution failed"));

  safeSend(webContents, "rina:stream:end", {
    streamId,
    ok: cancelled ? false : report.ok,
    code: exitCode,
    cancelled,
    error,
    report,
  });
  withStructuredSessionWrite(() => {
    structuredSessionStore?.endCommand({
      streamId,
      ok: cancelled ? false : report.ok,
      code: typeof exitCode === "number" ? exitCode : null,
      cancelled,
      error,
    });
  });
  return {
    ok: cancelled ? false : report.ok,
    cancelled,
    error,
  };
}

/**
 * Soft cancellation handler (v1).
 * NOTE: We do NOT kill processes here in v1 unless you define a high-impact process.kill tool.
 */
async function cancelStream(streamId: string): Promise<{ ok: boolean; message: string }> {
  const id = String(streamId || "").trim();
  if (!id) return { ok: false, message: "Missing streamId." };

  const mappedPlanRunId = streamToPlanRun.get(id);
  if (mappedPlanRunId) {
    const st = runningPlanRuns.get(mappedPlanRunId);
    if (st) st.stopped = true;
    if (st?.agentdPlanRunId) {
      try {
        await agentdJson("/v1/cancel", {
          method: "POST",
          body: { planRunId: st.agentdPlanRunId, streamId: id, reason: "soft" },
          includeLicenseToken: true,
        });
        return { ok: true, message: "Cancellation requested." };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "Cancellation failed" };
      }
    }

    // Cancellation can race plan-run registration; acknowledge and let stop flag halt continuation.
    return { ok: true, message: "Cancellation queued." };
  }

  const entry = running.get(id);
  if (!entry) return { ok: false, message: "No running process for that streamId." };

  entry.cancelled = true;

  return { ok: true, message: "Cancellation requested." };
}

async function hardKillStream(streamId: string): Promise<{ ok: boolean; message: string }> {
  const id = String(streamId || "").trim();
  if (!id) return { ok: false, message: "Missing streamId." };

  const ownerId = ptyStreamOwners.get(id);
  if (typeof ownerId === "number") {
    closePtyForWebContents(ownerId);
    return { ok: true, message: "PTY killed." };
  }

  const mappedPlanRunId = streamToPlanRun.get(id);
  if (mappedPlanRunId) {
    const st = runningPlanRuns.get(mappedPlanRunId);
    if (st) st.stopped = true;
    if (st?.agentdPlanRunId) {
      try {
        await agentdJson("/v1/cancel", {
          method: "POST",
          body: { planRunId: st.agentdPlanRunId, streamId: id, reason: "hard" },
          includeLicenseToken: true,
        });
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "Hard cancel failed" };
      }
    }

    return { ok: true, message: "Hard cancellation queued." };
  }

  const entry = running.get(id);
  if (entry) {
    entry.cancelled = true;
    return { ok: true, message: "Marked cancelled." };
  }

  return { ok: false, message: "No running process for that streamId." };
}

// IPC Handlers

// ============================================================
// Entitlement Persistence
// ============================================================
const ENTITLEMENT_FILE = () => path.join(app.getPath("userData"), "license-entitlement.json");

type EntitlementData = {
  tier: LicenseTier;
  token: string | null;
  expiresAt: number | null;
  customerId: string | null;
  verifiedAt: string;
  lastVerifiedAt: string; // ISO timestamp of last successful verification
  status: string; // active, trialing, canceled, expired, etc.
};

// Current license status (runtime state)
let currentLicenseStatus: string = "unknown";

/**
 * Tiers that represent lifetime/paid-once licenses (no expiry required)
 */
const LIFETIME_TIERS: ReadonlySet<LicenseTier> = new Set(["founder", "pioneer"] as const);

/**
 * Validate entitlement expiry with explicit lifetime handling.
 * - Subscription tiers MUST have a finite, future expiresAt
 * - Lifetime tiers (founder, pioneer) MAY have null expiresAt
 * - Rejects missing, non-finite, or past timestamps
 */
function validateEntitlementExpiry(data: EntitlementData): { ok: boolean; reason?: string } {
  const { tier, expiresAt } = data;
  
  // Lifetime tiers: null expiresAt is valid
  if (LIFETIME_TIERS.has(tier)) {
    if (expiresAt === null) return { ok: true };
    // If lifetime has an expiry, it must be finite and future
    if (!Number.isFinite(expiresAt)) {
      return { ok: false, reason: "Lifetime tier has non-finite expiresAt" };
    }
    if (Date.now() > expiresAt * 1000) {
      return { ok: false, reason: "Lifetime tier has expired" };
    }
    return { ok: true };
  }
  
  // Subscription tiers: expiresAt is required and must be future
  if (expiresAt === null) {
    return { ok: false, reason: "Subscription tier missing expiresAt" };
  }
  if (!Number.isFinite(expiresAt)) {
    return { ok: false, reason: "Subscription tier has non-finite expiresAt" };
  }
  if (Date.now() > expiresAt * 1000) {
    return { ok: false, reason: "Subscription has expired" };
  }
  
  return { ok: true };
}

/**
 * Check if entitlement needs soft refresh (stale > 24h)
 */
function isEntitlementStale(data: EntitlementData): boolean {
  if (!data.lastVerifiedAt) return true;
  const lastVerified = Date.parse(data.lastVerifiedAt);
  if (!Number.isFinite(lastVerified)) return true;
  const hoursSinceVerify = (Date.now() - lastVerified) / (1000 * 60 * 60);
  return hoursSinceVerify > 24;
}

function saveEntitlements(): void {
  try {
    const data: EntitlementData = {
      tier: currentLicenseTier,
      token: currentLicenseToken,
      expiresAt: currentLicenseExpiresAt,
      customerId: currentLicenseCustomerId,
      verifiedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      status: currentLicenseStatus,
    };
    writeJsonFile(ENTITLEMENT_FILE(), data);
    // Sanitized log - no token/customer_id in production
    if (app.isPackaged) {
      console.log("[license] Entitlement saved for tier:", currentLicenseTier);
    } else {
      console.log("[license] Entitlement saved:", { tier: currentLicenseTier, status: currentLicenseStatus });
    }
  } catch (err) {
    console.warn("[license] Failed to save entitlements:", err);
  }
}

function loadEntitlements(): EntitlementData | null {
  try {
    const data = readJsonIfExists<EntitlementData>(ENTITLEMENT_FILE());
    if (!data) return null;
    
    // Validate expiry with explicit lifetime handling
    const validation = validateEntitlementExpiry(data);
    if (!validation.ok) {
      console.log("[license] Stored entitlement invalid:", validation.reason);
      try {
        fs.unlinkSync(ENTITLEMENT_FILE());
      } catch {
        // ignore
      }
      return null;
    }
    
    return data;
  } catch (err) {
    console.warn("[license] Failed to load entitlements:", err);
    return null;
  }
}

function applyStoredEntitlement(data: EntitlementData): void {
  currentLicenseTier = data.tier;
  currentLicenseToken = data.token;
  currentLicenseExpiresAt = data.expiresAt;
  currentLicenseCustomerId = data.customerId;
  currentLicenseStatus = data.status || "unknown";
}

async function workspacePickDirectoryForIpc() {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Project Root",
    buttonLabel: "Select Folder"
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
}

async function workspacePickForIpc() {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Workspace Folder",
    buttonLabel: "Select"
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false };
  }
  
  return { ok: true, path: result.filePaths[0] };
}

async function workspaceDefaultForIpc(senderId: number) {
  const existing = ptySessions.get(senderId);
  const path = existing?.cwd || getDefaultPtyCwd();
  return { ok: true, path };
}

async function codeListFilesForIpc(args?: { projectRoot?: string; limit?: number }) {
  try {
    const projectRoot = resolveProjectRootSafe(args?.projectRoot);
    const files = listProjectFilesSafe(projectRoot, args?.limit);
    return { ok: true, files };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function codeReadFileForIpc(args?: { projectRoot?: string; relativePath?: string; maxBytes?: number }) {
  try {
    const projectRoot = resolveProjectRootSafe(args?.projectRoot);
    return readProjectFileSafe({
      projectRoot,
      relativePath: String(args?.relativePath || ""),
      maxBytes: args?.maxBytes,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function pingForIpc() {
  return { pong: true, timestamp: new Date().toISOString() };
}

async function historyImportForIpc(limit?: number) {
  try {
    const data = importShellHistory(Number(limit || 300));
    return { ok: true, ...data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function diagnoseHotForIpc() {
  if (process.platform === "linux") return await diagnoseHotLinux();
  return { platform: process.platform, message: "Tuned for Kali/Linux." };
}

async function planForIpc(intent: string) {
  addTranscriptEntry({ type: "intent", timestamp: new Date().toISOString(), intent });
  const plan = makePlan(intent);
  addTranscriptEntry({ type: "plan", timestamp: new Date().toISOString(), plan });
  return plan;
}

async function playbooksGetForIpc() {
  return PLAYBOOKS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    signals: p.signals,
    fixOptions: p.fixOptions.map(f => ({
      name: f.name,
      description: f.description,
      risk: f.risk
    }))
  }));
}

async function playbookExecuteForIpc(playbookId: string, fixIndex: number) {
  const playbook = PLAYBOOKS.find(p => p.id === playbookId);
  if (!playbook) throw new Error("Playbook not found");

  const fix = playbook.fixOptions[fixIndex];
  if (!fix) throw new Error("Fix option not found");

  addTranscriptEntry({ type: "playbook", timestamp: new Date().toISOString(), playbookId, playbookName: playbook.name });
  
  return {
    playbook,
    fix,
    steps: fix.commands.map((cmd, i) => ({
      id: `f${fixIndex}_s${i + 1}`,
      tool: "terminal",
      command: cmd,
      risk: fix.risk,
      description: fix.verification
    }))
  };
}

async function redactionPreviewForIpc(text: string) {
  const out = redactText(String(text || ""));
  return {
    redactedText: out.redactedText,
    hits: out.hits,
    redactionCount: out.hits.length,
  };
}
async function exportPreviewForIpc(args: { kind: ExportPreviewKind; sessionId?: string }) {
  const kind = String(args?.kind || "") as ExportPreviewKind;
  let payload = "";
  let redactionCount = 0;
  let hits: Array<{ start: number; end: number; kind: string; level: string; preview: string }> = [];
  let mime = "text/plain";
  let fileName = `rina-export-${Date.now()}.txt`;

  if (kind === "runbook_markdown") {
    const markdown = structuredSessionStore
      ? structuredSessionStore.exportRunbookMarkdown(args?.sessionId)
      : "# RinaWarp Runbook\n\nStructured session store is disabled.\n";
    const redacted = redactText(markdown);
    payload = redacted.redactedText;
    redactionCount = redacted.hits.length;
    hits = redacted.hits;
    mime = "text/markdown";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fileName = `rina-structured-runbook-${stamp}.md`;
  } else if (kind === "audit_json") {
    payload = buildAuditExportText();
    redactionCount = (payload.match(/\[REDACTED\]/g) || []).length;
    hits = [];
    mime = "application/json";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fileName = `rina-audit-${stamp}.json`;
  } else {
    return { ok: false, error: "Unsupported export kind" };
  }

  if (!payload.trim()) return { ok: false, error: "Empty export payload" };

  const now = Date.now();
  pruneExportPreviewTokens(now);
  const previewId = newExportPreviewId();
  const rec: ExportPreviewRecord = {
    id: previewId,
    kind,
    createdAtMs: now,
    expiresAtMs: now + EXPORT_PREVIEW_TTL_MS,
    createdBy: getCurrentUserEmail(),
    payload,
    mime,
    fileName,
    redactionCount,
    contentHash: hashText(payload),
  };
  exportPreviewTokens.set(previewId, rec);
  return {
    ok: true,
    previewId,
    kind,
    redactedText: payload,
    redactionCount,
    hits,
    mime,
    fileName,
    contentHash: rec.contentHash,
    expiresAt: new Date(rec.expiresAtMs).toISOString(),
  };
}

async function exportPublishForIpc(args: { previewId?: string; typedConfirm?: string; expectedHash?: string }) {
  const previewId = String(args?.previewId || "").trim();
  if (!previewId) return { ok: false, error: "Export publish requires previewId." };
  if (String(args?.typedConfirm || "") !== "PUBLISH") {
    return { ok: false, error: 'Export publish requires typed confirmation "PUBLISH".' };
  }

  pruneExportPreviewTokens();
  const rec = exportPreviewTokens.get(previewId);
  if (!rec) return { ok: false, error: "Export preview expired. Generate a new preview before publish." };
  if (rec.createdBy !== getCurrentUserEmail()) {
    return { ok: false, error: "Export preview is not valid for the active user." };
  }
  if (rec.expiresAtMs <= Date.now()) {
    exportPreviewTokens.delete(previewId);
    return { ok: false, error: "Export preview expired. Generate a new preview before publish." };
  }
  if (args?.expectedHash && String(args.expectedHash) !== rec.contentHash) {
    return { ok: false, error: "Export payload changed since preview; regenerate preview." };
  }

  exportPreviewTokens.delete(previewId);
  return {
    ok: true,
    kind: rec.kind,
    content: rec.payload,
    mime: rec.mime,
    fileName: rec.fileName,
    redactionCount: rec.redactionCount,
  };
}
async function sharePreviewForIpc(args: { content: string }) {
  const actorRole = getCurrentRole();
  if (!hasRoleAtLeast(actorRole, "operator")) {
    return { ok: false, error: "Only owner/operator can preview published shares." };
  }
  const content = String(args?.content || "");
  if (!content.trim()) return { ok: false, error: "Empty share content" };
  const redacted = redactText(content);
  const now = Date.now();
  pruneSharePreviewTokens(now);
  const previewId = newSharePreviewId();
  const rec: SharePreviewRecord = {
    id: previewId,
    createdAtMs: now,
    expiresAtMs: now + SHARE_PREVIEW_TTL_MS,
    createdBy: getCurrentUserEmail(),
    redactedContent: redacted.redactedText,
    redactionCount: redacted.hits.length,
    contentHash: hashText(redacted.redactedText),
  };
  sharePreviewTokens.set(previewId, rec);
  return {
    ok: true,
    previewId,
    redactedText: rec.redactedContent,
    hits: redacted.hits,
    redactionCount: rec.redactionCount,
    expiresAt: new Date(rec.expiresAtMs).toISOString(),
  };
}

async function shareCreateForIpc(args: {
  title?: string;
  content?: string;
  expiresDays?: number;
  requiredRole?: Role;
  previewId?: string;
}) {
  const actorRole = getCurrentRole();
  if (!hasRoleAtLeast(actorRole, "operator")) {
    return { ok: false, error: "Only owner/operator can publish shares." };
  }
  const previewId = String(args?.previewId || "").trim();
  if (!previewId) return { ok: false, error: "Publish requires a redaction preview confirmation." };
  pruneSharePreviewTokens();
  const preview = sharePreviewTokens.get(previewId);
  if (!preview) return { ok: false, error: "Share preview expired. Generate a new preview before publish." };
  if (preview.createdBy !== getCurrentUserEmail()) {
    return { ok: false, error: "Share preview is not valid for the active user." };
  }
  if (preview.expiresAtMs <= Date.now()) {
    sharePreviewTokens.delete(previewId);
    return { ok: false, error: "Share preview expired. Generate a new preview before publish." };
  }
  if (args?.content && String(args.content).trim()) {
    const supplied = redactText(String(args.content)).redactedText;
    if (hashText(supplied) !== preview.contentHash) {
      return { ok: false, error: "Publish payload does not match the approved preview." };
    }
  }
  const expiresDays = Math.max(1, Math.min(90, Number(args?.expiresDays || 7)));
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();
  const requiredRole =
    args?.requiredRole && ["owner", "operator", "viewer"].includes(args.requiredRole)
      ? args.requiredRole
      : "viewer";
  const db = loadSharesDb();
  const rec: ShareRecord = {
    id: `shr_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUserEmail(),
    title: args?.title ? String(args.title).slice(0, 120) : undefined,
    content: preview.redactedContent,
    revoked: false,
    expiresAt,
    requiredRole,
  };
  db.shares.unshift(rec);
  db.shares = db.shares.slice(0, 500);
  saveSharesDb(db);
  sharePreviewTokens.delete(previewId);
  appendTeamActivity("share_created", rec.id, {
    requiredRole: rec.requiredRole,
    expiresAt: rec.expiresAt,
    title: rec.title || null,
  });
  return { ok: true, share: rec };
}

async function shareListForIpc() {
  const db = loadSharesDb();
  const role = getCurrentRole();
  return db.shares
    .filter((s) => hasRoleAtLeast(role, s.requiredRole))
    .map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      createdBy: s.createdBy,
      title: s.title,
      revoked: s.revoked,
      expiresAt: s.expiresAt,
      requiredRole: s.requiredRole,
    }));
}

async function shareGetForIpc(id: string) {
  const db = loadSharesDb();
  const found = db.shares.find((s) => s.id === id);
  if (!found) return { ok: false, error: "Share not found" };
  if (found.revoked) return { ok: false, error: "Share revoked" };
  if (Date.now() > Date.parse(found.expiresAt)) return { ok: false, error: "Share expired" };
  const role = getCurrentRole();
  if (!hasRoleAtLeast(role, found.requiredRole)) {
    appendTeamActivity("share_access_denied", found.id, {
      requiredRole: found.requiredRole,
      actorRole: role,
    });
    return { ok: false, error: "Insufficient role for share" };
  }
  appendTeamActivity("share_accessed", found.id, {
    requiredRole: found.requiredRole,
  });
  return { ok: true, share: found };
}

async function shareRevokeForIpc(id: string) {
  const role = getCurrentRole();
  if (!hasRoleAtLeast(role, "operator")) {
    return { ok: false, error: "Only owner/operator can revoke shares." };
  }
  const db = loadSharesDb();
  const idx = db.shares.findIndex((s) => s.id === id);
  if (idx === -1) return { ok: false, error: "Share not found" };
  db.shares[idx] = { ...db.shares[idx], revoked: true };
  saveSharesDb(db);
  appendTeamActivity("share_revoked", id);
  return { ok: true };
}
async function teamGetForIpc() {
  return loadTeamDb();
}

async function teamCreateInviteForIpc(args: { email?: string; role?: Role; expiresHours?: number }) {
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can create invites" };
  const email = String(args?.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email required" };
  const role = args?.role;
  if (!role || !["owner", "operator", "viewer"].includes(role)) return { ok: false, error: "Invalid role" };
  const expiresHours = Math.max(1, Math.min(24 * 14, Number(args?.expiresHours || 72)));
  const invites = loadTeamInvitesDb();
  const token = `rwi_${crypto.randomBytes(18).toString("hex")}`;
  const rec: TeamInviteRecord = {
    id: `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    token,
    email,
    role,
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUserEmail(),
    expiresAt: new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString(),
    status: "pending",
  };
  invites.invites.unshift(rec);
  invites.invites = invites.invites.slice(0, 1000);
  saveTeamInvitesDb(invites);
  appendTeamActivity("invite_created", rec.id, { email: rec.email, role: rec.role, expiresAt: rec.expiresAt });
  return {
    ok: true,
    invite: {
      ...rec,
      inviteCode: `${rec.id}.${rec.token}`,
    },
  };
}

async function teamListInvitesForIpc(args?: { includeSecrets?: boolean }) {
  if (!hasRoleAtLeast(getCurrentRole(), "operator")) {
    return { ok: false, error: "Only owner/operator can list invites." };
  }
  const includeSecrets = !!args?.includeSecrets && getCurrentRole() === "owner";
  const invites = loadTeamInvitesDb().invites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    createdAt: inv.createdAt,
    createdBy: inv.createdBy,
    expiresAt: inv.expiresAt,
    status: inv.status,
    acceptedAt: inv.acceptedAt || null,
    acceptedBy: inv.acceptedBy || null,
    ...(includeSecrets ? { inviteCode: `${inv.id}.${inv.token}` } : {}),
  }));
  return { ok: true, invites };
}

async function teamAcceptInviteForIpc(args: { inviteCode?: string }) {
  const inviteCode = String(args?.inviteCode || "").trim();
  if (!inviteCode.includes(".")) return { ok: false, error: "Invalid invite code format" };
  const [id, token] = inviteCode.split(".", 2);
  const invites = loadTeamInvitesDb();
  const idx = invites.invites.findIndex((inv) => inv.id === id);
  if (idx === -1) return { ok: false, error: "Invite not found" };
  const target = invites.invites[idx];
  if (target.status !== "pending") return { ok: false, error: `Invite is ${target.status}` };
  if (target.token !== token) return { ok: false, error: "Invite code mismatch" };
  if (Date.parse(target.expiresAt) <= Date.now()) {
    invites.invites[idx] = { ...target, status: "expired" };
    saveTeamInvitesDb(invites);
    return { ok: false, error: "Invite expired" };
  }
  const currentUser = getCurrentUserEmail();
  if (currentUser !== target.email) {
    return { ok: false, error: `Invite is for ${target.email}; switch current user first.` };
  }
  const team = loadTeamDb();
  const memberIdx = team.members.findIndex((m) => m.email === currentUser);
  if (memberIdx >= 0) {
    team.members[memberIdx] = { email: currentUser, role: target.role };
  } else {
    team.members.push({ email: currentUser, role: target.role });
  }
  saveTeamDb(team);
  invites.invites[idx] = {
    ...target,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
    acceptedBy: currentUser,
  };
  saveTeamInvitesDb(invites);
  appendTeamActivity("invite_accepted", target.id, { email: currentUser, role: target.role });
  return { ok: true, role: target.role };
}

async function teamRevokeInviteForIpc(idRaw: string) {
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can revoke invites" };
  const id = String(idRaw || "").trim();
  if (!id) return { ok: false, error: "Invite id required" };
  const invites = loadTeamInvitesDb();
  const idx = invites.invites.findIndex((inv) => inv.id === id);
  if (idx === -1) return { ok: false, error: "Invite not found" };
  if (invites.invites[idx].status === "accepted") return { ok: false, error: "Accepted invite cannot be revoked" };
  invites.invites[idx] = { ...invites.invites[idx], status: "revoked" };
  saveTeamInvitesDb(invites);
  appendTeamActivity("invite_revoked", id);
  return { ok: true };
}

async function teamSetCurrentUserForIpc(email: string) {
  const team = loadTeamDb();
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Email required" };
  if (!team.members.some((m) => m.email === normalized)) {
    team.members.push({ email: normalized, role: "viewer" });
  }
  const previousUser = team.currentUser || null;
  team.currentUser = normalized;
  saveTeamDb(team);
  appendTeamActivity("current_user_changed", normalized, { previousUser });
  return { ok: true, role: team.members.find((m) => m.email === normalized)?.role || "viewer" };
}

async function teamUpsertMemberForIpc(member: { email: string; role: Role }) {
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can change team roles" };
  const team = loadTeamDb();
  const email = String(member?.email || "").trim().toLowerCase();
  const role = member?.role;
  if (!email) return { ok: false, error: "Email required" };
  if (!["owner", "operator", "viewer"].includes(role)) return { ok: false, error: "Invalid role" };
  const idx = team.members.findIndex((m) => m.email === email);
  if (idx >= 0) team.members[idx] = { email, role };
  else team.members.push({ email, role });
  saveTeamDb(team);
  appendTeamActivity("member_upserted", email, { role });
  return { ok: true };
}

async function teamRemoveMemberForIpc(emailRaw: string) {
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can remove team members" };
  const team = loadTeamDb();
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email required" };
  const target = team.members.find((m) => m.email === email);
  if (!target) return { ok: false, error: "Member not found" };
  if (target.role === "owner") {
    const ownerCount = team.members.filter((m) => m.role === "owner").length;
    if (ownerCount <= 1) return { ok: false, error: "Cannot remove last owner" };
  }
  team.members = team.members.filter((m) => m.email !== email);
  if (team.currentUser === email) {
    team.currentUser = team.members[0]?.email || "owner@local";
    if (!team.members.some((m) => m.email === team.currentUser)) {
      team.members.unshift({ email: team.currentUser, role: "owner" });
    }
  }
  saveTeamDb(team);
  appendTeamActivity("member_removed", email);
  return { ok: true };
}

async function teamActivityForIpc(args?: { limit?: number }) {
  if (!hasRoleAtLeast(getCurrentRole(), "operator")) {
    return { ok: false, error: "Only owner/operator can access team activity." };
  }
  const limit = Math.max(1, Math.min(500, Number(args?.limit || 100)));
  return { ok: true, events: loadTeamActivity(limit) };
}

async function auditExportForIpc() {
  if (!hasRoleAtLeast(getCurrentRole(), "operator")) {
    return { ok: false, error: "Only owner/operator can export audit logs." };
  }
  return buildAuditExportText();
}
async function executeStepStreamForIpc(args: {
  eventSender: Electron.WebContents;
  step: ToolStep;
  confirmed: boolean;
  confirmationText: string;
  projectRoot: string;
}) {
  const { eventSender, step, confirmed, confirmationText, projectRoot } = args;
  const streamId = createStreamId();
  const normalizedRoot = resolveProjectRootSafe(projectRoot);
  const profileGate = gateProfileCommand({
    projectRoot: normalizedRoot,
    command: step.command,
    risk: step.risk,
    confirmed,
    confirmationText,
  });
  if (!profileGate.ok) {
    safeSend(eventSender, "rina:stream:end", {
      streamId,
      ok: false,
      code: null,
      cancelled: false,
      error: profileGate.message,
      report: { ok: false, haltedBecause: "profile_blocked", steps: [] },
    });
    return { streamId };
  }
  const policyGate = evaluatePolicyGate(step.command, confirmed, confirmationText);
  if (!policyGate.ok) {
    safeSend(eventSender, "rina:stream:end", {
      streamId,
      ok: false,
      code: null,
      cancelled: false,
      error: policyGate.message || "Blocked by policy.",
      report: { ok: false, haltedBecause: "policy_blocked", steps: [] },
    });
    return { streamId };
  }

  const sessionId = ensureStructuredSession({
    source: "execute_step_stream",
    projectRoot: normalizedRoot,
  });
  withStructuredSessionWrite(() => {
    structuredSessionStore?.beginCommand({
      sessionId: sessionId || undefined,
      streamId,
      command: step.command,
      cwd: normalizedRoot,
      risk: step.risk,
      source: "execute_step_stream",
    });
  });
  
  addTranscriptEntry({
    type: "approval",
    timestamp: new Date().toISOString(),
    stepId: step.id,
    command: step.command,
    risk: step.risk,
    approved: confirmed
  });

  addTranscriptEntry({
    type: "execution_start",
    timestamp: new Date().toISOString(),
    streamId,
    stepId: step.id,
    command: step.command
  });

  const localPlanRunId = newPlanRunId();
  runningPlanRuns.set(localPlanRunId, { stopped: false });
  streamToPlanRun.set(streamId, localPlanRunId);

  // Fire and forget; UI listens to stream events via emitted callbacks
  void (async () => {
    try {
      try {
        const execResp = await agentdJson<{ ok: true; planRunId: string }>("/v1/execute-plan", {
          method: "POST",
          body: {
            plan: [toAgentdStep(step, normalizedRoot)],
            projectRoot: normalizedRoot,
            confirmed,
            confirmationText: confirmationText ?? "",
          },
          includeLicenseToken: true,
        });

        const state = runningPlanRuns.get(localPlanRunId);
        if (state) state.agentdPlanRunId = execResp.planRunId;

        const response = await fetch(`${AGENTD_BASE_URL}/v1/stream?planRunId=${encodeURIComponent(execResp.planRunId)}`, {
          method: "GET",
          headers: buildAgentdHeaders({ includeLicenseToken: true }),
        });
        if (!response.ok || !response.body) {
          throw new Error(`agentd stream failed (${response.status})`);
        }

        const decoder = new TextDecoder();
        const reader = response.body.getReader();
        let buffer = "";
        let haltedBecause: string | undefined;
        let stepEndSent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const sep = buffer.indexOf("\n\n");
            if (sep === -1) break;
            const rawEvent = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const lines = rawEvent.split(/\r?\n/);
            let eventName = "message";
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
            }
            const payloadText = dataLines.join("\n");
            const payload = payloadText ? JSON.parse(payloadText) : {};

            if (eventName === "chunk") {
              safeSend(eventSender, "rina:stream:chunk", {
                streamId,
                stream: payload.stream,
                data: forRendererDisplay(payload.data),
              });
              withStructuredSessionWrite(() => {
                const mapped = payload.stream === "stderr" ? "stderr" : payload.stream === "meta" ? "meta" : "stdout";
                structuredSessionStore?.appendChunk(streamId, mapped, redactChunkIfNeeded(String(payload.data || "")));
              });
              continue;
            }

            if (eventName === "plan_step_end") {
              const report = payload.report;
              const lastResult = report?.steps?.[report.steps.length - 1]?.result;
              const exitCode = lastResult?.meta?.exitCode ?? null;
              const error = payload.ok ? null : (report?.haltedBecause || lastResult?.error || "Execution failed");
              stepEndSent = true;
              safeSend(eventSender, "rina:stream:end", {
                streamId,
                ok: !!payload.ok,
                code: exitCode,
                cancelled: false,
                error,
                report,
              });
              withStructuredSessionWrite(() => {
                structuredSessionStore?.endCommand({
                  streamId,
                  ok: !!payload.ok,
                  code: typeof exitCode === "number" ? exitCode : null,
                  cancelled: false,
                  error,
                });
              });
              continue;
            }

            if (eventName === "plan_halt") {
              haltedBecause = payload?.reason || "halted";
              continue;
            }

            if (eventName === "plan_run_end" && haltedBecause && !stepEndSent) {
              safeSend(eventSender, "rina:stream:end", {
                streamId,
                ok: false,
                code: null,
                cancelled: false,
                error: haltedBecause,
                report: { ok: false, haltedBecause, steps: [] },
              });
              withStructuredSessionWrite(() => {
                structuredSessionStore?.endCommand({
                  streamId,
                  ok: false,
                  code: null,
                  cancelled: false,
                  error: haltedBecause,
                });
              });
            }
          }
        }
      } catch (error) {
        if (!ALLOW_LOCAL_ENGINE_FALLBACK) throw error;
        await startStreamingStepViaEngine({
          webContents: eventSender,
          streamId,
          step,
          confirmed,
          confirmationText,
          projectRoot: normalizedRoot,
        });
      }
    } catch (error) {
      safeSend(eventSender, "rina:stream:end", {
        streamId,
        ok: false,
        code: null,
        cancelled: false,
        error: error instanceof Error ? error.message : "Execution failed",
        report: { ok: false, haltedBecause: "execution_failed", steps: [] },
      });
      withStructuredSessionWrite(() => {
        structuredSessionStore?.endCommand({
          streamId,
          ok: false,
          code: null,
          cancelled: false,
          error: error instanceof Error ? error.message : "Execution failed",
        });
      });
    } finally {
      streamToPlanRun.delete(streamId);
      runningPlanRuns.delete(localPlanRunId);
    }
  })();

  return { streamId };
}

async function streamCancelForIpc(streamId: string) {
  return cancelStream(streamId);
}

async function streamKillForIpc(streamId: string) {
  return hardKillStream(streamId);
}

// ============================================================
// Plan Run Tracking (for stop functionality)
// ============================================================
type PlanRunState = {
  stopped: boolean;
  currentStreamId?: string;
  agentdPlanRunId?: string;
};

const runningPlanRuns = new Map<string, PlanRunState>();
const streamToPlanRun = new Map<string, string>();

function newPlanRunId() {
  return `plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toAgentdRisk(stepRisk: Risk): "inspect" | "safe-write" | "high-impact" {
  if (stepRisk === "high-impact") return "high-impact";
  if (stepRisk === "safe-write") return "safe-write";
  return "inspect";
}

function toRiskLevel(stepRisk: Risk): "low" | "medium" | "high" {
  if (stepRisk === "high-impact") return "high";
  if (stepRisk === "safe-write") return "medium";
  return "low";
}

function toAgentdStep(step: ToolStep, projectRoot: string) {
  const requiresConfirmation = step.risk === "high-impact";
  return {
    stepId: step.id,
    tool: "terminal.write",
    input: {
      command: step.command,
      cwd: projectRoot,
      timeoutMs: 60_000,
      stepId: step.id,
    },
    risk: toAgentdRisk(step.risk),
    risk_level: toRiskLevel(step.risk),
    requires_confirmation: requiresConfirmation,
    verification_plan: { steps: [] as Array<{ tool: string; input: unknown }> },
    ...(requiresConfirmation ? { confirmationScope: createConfirmationScope(step) } : {}),
  };
}

async function pipeAgentdSseToRenderer(args: {
  eventSender: Electron.WebContents;
  localPlanRunId: string;
  agentdPlanRunId: string;
  runId: string;
}) {
  const { eventSender, localPlanRunId, agentdPlanRunId, runId } = args;
  const response = await fetch(`${AGENTD_BASE_URL}/v1/stream?planRunId=${encodeURIComponent(agentdPlanRunId)}`, {
    method: "GET",
    headers: buildAgentdHeaders({ includeLicenseToken: true }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`agentd stream failed (${response.status})`);
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";
  let haltedBecause: string | undefined;

  const readLoop = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const sep = buffer.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const lines = rawEvent.split(/\r?\n/);
        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        const payloadText = dataLines.join("\n");
        const payload = payloadText ? JSON.parse(payloadText) : {};

        if (eventName === "plan_step_start") {
          const streamId = payload.streamId;
          if (typeof streamId === "string") {
            streamToPlanRun.set(streamId, localPlanRunId);
            withStructuredSessionWrite(() => {
              const command = String(payload?.step?.input?.command || "");
              const cwd = String(payload?.step?.input?.cwd || "");
              structuredSessionStore?.beginCommand({
                streamId,
                command,
                cwd: cwd || undefined,
                risk: payload?.step?.risk_level || payload?.step?.risk,
                source: "plan_stream_agentd",
              });
            });
          }
          safeSend(eventSender, "rina:plan:stepStart", {
            planRunId: localPlanRunId,
            runId,
            streamId: payload.streamId,
            step: {
              stepId: payload?.step?.stepId ?? payload?.step?.id ?? payload?.streamId,
              tool: "terminal",
              input: payload?.step?.input ?? {},
            },
          });
          continue;
        }

        if (eventName === "chunk") {
          safeSend(eventSender, "rina:stream:chunk", {
            streamId: payload.streamId,
            stream: payload.stream,
            data: forRendererDisplay(payload.data),
          });
          if (typeof payload.streamId === "string") {
            withStructuredSessionWrite(() => {
              const mapped = payload.stream === "stderr" ? "stderr" : payload.stream === "meta" ? "meta" : "stdout";
              structuredSessionStore?.appendChunk(payload.streamId, mapped, redactChunkIfNeeded(String(payload.data || "")));
            });
          }
          continue;
        }

        if (eventName === "plan_step_end") {
          const report = payload.report;
          const lastResult = report?.steps?.[report.steps.length - 1]?.result;
          const exitCode = lastResult?.meta?.exitCode ?? null;
          const error = payload.ok ? null : (report?.haltedBecause || lastResult?.error || "Execution failed");
          if (typeof payload.streamId === "string") {
            streamToPlanRun.delete(payload.streamId);
          }
          safeSend(eventSender, "rina:stream:end", {
            streamId: payload.streamId,
            ok: !!payload.ok,
            code: exitCode,
            cancelled: false,
            error,
            report,
          });
          if (typeof payload.streamId === "string") {
            withStructuredSessionWrite(() => {
              structuredSessionStore?.endCommand({
                streamId: payload.streamId,
                ok: !!payload.ok,
                code: typeof exitCode === "number" ? exitCode : null,
                cancelled: false,
                error,
              });
            });
          }
          continue;
        }

        if (eventName === "plan_halt") {
          haltedBecause = payload?.reason || "halted";
          continue;
        }

        if (eventName === "plan_run_end") {
          for (const [streamId, localPlan] of streamToPlanRun.entries()) {
            if (localPlan === localPlanRunId) streamToPlanRun.delete(streamId);
          }
          return haltedBecause;
        }
      }
    }
    return haltedBecause;
  };

  return readLoop();
}

// Stop plan: halts future steps + cancels current stream (soft cancel)
async function planStopForIpc(planRunId: string) {
  const state = runningPlanRuns.get(planRunId);
  if (!state) {
    return { ok: false, message: "No running plan for that planRunId." };
  }

  state.stopped = true;

  if (state.agentdPlanRunId) {
    try {
      await agentdJson("/v1/cancel", {
        method: "POST",
        body: { planRunId: state.agentdPlanRunId, reason: "user" },
        includeLicenseToken: true,
      });
    } catch {
      // no-op on best-effort cancel
    }
  }

  if (state.currentStreamId) {
    try {
      await cancelStream(state.currentStreamId);
    } catch {
      // Stream may have already completed
    }
  }

  return { ok: true };
}

// --- System Doctor IPC ---
import {
  doctorInspect,
  doctorCollect,
  doctorInterpret,
  doctorVerify,
  doctorExecuteFix,
  doctorGetTranscript,
  doctorExportTranscript
} from "./doctor-bridge.js";

import { chatRouter } from "./chat-router.js";

async function doctorInspectForIpc(intent: string) {
  return await doctorInspect(intent);
}

async function doctorCollectForIpc(steps: any[], _streamCallback?: unknown) {
  for (const step of Array.isArray(steps) ? steps : []) {
    const command = step?.input?.command;
    if (typeof command !== "string" || !command.trim()) continue;
    const gate = evaluatePolicyGate(command, false, "");
    if (!gate.ok) {
      throw new Error(gate.message || `Blocked by policy: ${command}`);
    }
  }
  return await doctorCollect(steps, undefined);
}

async function doctorInterpretForIpc(payload: { intent: string; evidence: any }) {
  const safePayload = {
    ...payload,
    intent: redactForModel(payload.intent),
    evidence: sanitizeForPersistence(payload.evidence),
  };
  return await doctorInterpret(safePayload);
}

async function doctorVerifyForIpc(payload: { intent: string; before: any; after: any; diagnosis?: any }) {
  const safePayload = {
    ...payload,
    intent: redactForModel(payload.intent),
    before: sanitizeForPersistence(payload.before),
    after: sanitizeForPersistence(payload.after),
    diagnosis: sanitizeForPersistence(payload.diagnosis),
  };
  return await doctorVerify(safePayload);
}

async function doctorExecuteFixForIpc(plan: any, confirmed: boolean, confirmationText: string) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  const projectRoot = resolveProjectRootSafe(process.cwd());
  for (const step of steps) {
    const command = step?.input?.command;
    if (typeof command !== "string" || !command.trim()) continue;
    const stepRisk: Risk = step?.risk === "high-impact" ? "high-impact" : step?.risk === "read" ? "read" : "safe-write";
    const profileGate = gateProfileCommand({
      projectRoot,
      command,
      risk: stepRisk,
      confirmed,
      confirmationText: confirmationText ?? "",
    });
    if (!profileGate.ok) {
      return { ok: false, haltedBecause: profileGate.message, steps: [] };
    }
    const gate = evaluatePolicyGate(command, confirmed, confirmationText ?? "");
    if (!gate.ok) {
      return { ok: false, haltedBecause: gate.message || "Blocked by policy.", steps: [] };
    }
  }
  return await doctorExecuteFix(plan, confirmed, confirmationText);
}

async function doctorTranscriptGetForIpc() {
  return doctorGetTranscript();
}

async function doctorTranscriptExportForIpc(format: "json" | "text") {
  return doctorExportTranscript(format);
}

// ============================================================
// Chat-Only Control Protocol - Conversation Orchestrator
// ============================================================

type ConversationStage =
  | "idle"
  | "inspecting"
  | "interpreting"
  | "awaiting-fix-choice"
  | "awaiting-confirmation"
  | "executing-fix"
  | "verifying"
  | "cancelled"
  | "done";

type ConversationState = {
  caseId: string;
  intent: string;
  stage: ConversationStage;
  evidenceBefore?: any;
  diagnosis?: any;
  fixOptions?: any[];
  pendingFix?: any;
  pendingRisk?: "safe-write" | "high-impact";
  activeStreamId?: string;
  startTime: string;
};

// Per-window conversation state
const conversations = new Map<Electron.BrowserWindow, ConversationState>();

function getConversation(win: Electron.BrowserWindow): ConversationState | null {
  return conversations.get(win) ?? null;
}

function setConversation(win: Electron.BrowserWindow, state: ConversationState | null) {
  if (state) {
    conversations.set(win, state);
  } else {
    conversations.delete(win);
  }
}

// Helper: classify message intent
function classifyIntent(text: string): {
  type: "system-doctor" | "dev-fixer" | "builder" | "chat";
  confidence: number;
  intent: string;
} {
  const s = text.toLowerCase();
  
  // System Doctor keywords
  const doctorKeywords = [
    "running hot", "overheat", "slow", "disk", "wifi", "network",
    "temperature", "cpu", "memory", "fan", "thermal", "disk full",
    "no space", "connection", "port", "service"
  ];
  
  for (const kw of doctorKeywords) {
    if (s.includes(kw)) {
      return { type: "system-doctor", confidence: 0.9, intent: text };
    }
  }
  
  // Dev fixer keywords
  const devKeywords = ["build", "compile", "error", "failed", "bug", "crash", "debug"];
  for (const kw of devKeywords) {
    if (s.includes(kw)) {
      return { type: "dev-fixer", confidence: 0.7, intent: text };
    }
  }
  
  // Builder keywords
  const builderKeywords = ["create", "scaffold", "project", "setup", "new file"];
  for (const kw of builderKeywords) {
    if (s.includes(kw)) {
      return { type: "builder", confidence: 0.6, intent: text };
    }
  }
  
  return { type: "chat", confidence: 0.5, intent: text };
}

// Helper: format findings for chat
function formatFindingsForChat(findings: any[]): string {
  if (!findings?.length) return "No significant issues found.";
  
  const critical = findings.filter(f => f.severity === "critical");
  const warnings = findings.filter(f => f.severity === "warn");
  const info = findings.filter(f => f.severity === "info");
  
  let parts: string[] = [];
  if (critical.length) {
    parts.push(`🚨 **Critical**: ${critical.map(f => f.title).join(", ")}`);
  }
  if (warnings.length) {
    parts.push(`⚠️ **Warnings**: ${warnings.map(f => f.title).join(", ")}`);
  }
  if (info.length) {
    parts.push(`ℹ️ **Info**: ${info.map(f => f.title).join(", ")}`);
  }
  
  return parts.join("\n");
}

// Helper: format diagnosis for chat
function formatDiagnosisForChat(diagnosis: any): string {
  if (!diagnosis?.primary) return "Unable to determine root cause.";
  
  const p = diagnosis.primary;
  const conf = Math.round(p.probability * 100);
  let msg = `**Most likely**: ${p.label} (${conf}% confidence)\n`;
  
  if (diagnosis.notes) {
    msg += `\n${diagnosis.notes}`;
  }
  
  if (diagnosis.differential?.length) {
    msg += `\n\n**Other possibilities**: ${diagnosis.differential.slice(0,3).map((d: any) => `${d.label} (${Math.round(d.probability * 100)}%)`).join(", ")}`;
  }
  
  return msg;
}

// Helper: format fix options for chat
function formatFixOptionsForChat(fixOptions: any[]): string {
  if (!fixOptions?.length) return "No fix options available.";
  
  return fixOptions.map((opt, i) => {
    const riskIcon = opt.risk === "high-impact" ? "🔴" : opt.risk === "safe-write" ? "🟡" : "🟢";
    return `${i + 1}. ${riskIcon} **${opt.label}** - ${opt.why || ""}\n   Expected: ${opt.expectedOutcome?.join(", ") || "issue resolved"}`;
  }).join("\n\n");
}

// Helper: format outcome for chat
function formatOutcomeForChat(outcome: any, verification: any): string {
  const status = outcome?.status || (verification?.ok ? "resolved" : "unknown");
  const statusEmoji = status === "resolved" ? "✅" : status === "improved" ? "📈" : status === "failed" ? "❌" : "⚠️";
  
  let msg = `${statusEmoji} **${status.toUpperCase()}**`;
  
  if (outcome?.rootCause) {
    msg += `\nRoot cause: ${outcome.rootCause}`;
  }
  
  if (outcome?.confidence) {
    msg += `\nConfidence: ${Math.round(outcome.confidence * 100)}%`;
  }
  
  if (outcome?.preventionTips?.length) {
    msg += `\n\n**Prevention**: ${outcome.preventionTips.join(", ")}`;
  }
  
  return msg;
}

async function chatSendForIpc(text: string, projectRoot?: string) {
  const safeText = redactText(String(text || "")).redactedText;
  const root = resolveProjectRootSafe(projectRoot || getDefaultPtyCwd());
  const profile = defaultProfileForProject(root);
  const rules = loadProjectRules(root, { parentLevels: 2 });
  return await chatRouter.handle(safeText, {
    projectRoot: root,
    rulesBlock: rulesToSystemBlock(rules),
    rulesWarnings: rules.warnings,
    profileSummary: summarizeProfile(profile),
  });
}

async function chatExportForIpc() {
  return doctorExportTranscript("text");
}

// ============================================================
// Warp-like Block Handlers
// ============================================================

// Doctor v1: Read-only evidence collection for diagnosing system issues
type DoctorPlanStep = {
  stepId: string;
  tool: string;
  input: any;
  confirmationScope?: string;
};

async function doctorPlanForIpc(args: { projectRoot: string; symptom: string }) {
  // Read-only evidence collection only (safe, no confirmation needed)
  const steps: DoctorPlanStep[] = [
    { stepId: "uptime", tool: "terminal.write", input: { command: "uptime", cwd: args.projectRoot } },
    { stepId: "cpu_top", tool: "terminal.write", input: { command: "ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%cpu | head -n 15", cwd: args.projectRoot } },
    { stepId: "mem_top", tool: "terminal.write", input: { command: "ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%mem | head -n 15", cwd: args.projectRoot } },
    { stepId: "disk_df", tool: "terminal.write", input: { command: "df -h", cwd: args.projectRoot } },
    { stepId: "disk_big", tool: "terminal.write", input: { command: "du -h -d 1 . 2>/dev/null | sort -h | tail -n 12", cwd: args.projectRoot } },
    { stepId: "sensors", tool: "terminal.write", input: { command: "sensors 2>/dev/null || echo \"sensors not available\"", cwd: args.projectRoot } },
  ];

  return {
    id: `doctor_${Date.now()}`,
    intent: args.symptom,
    reasoning: "I'll collect read-only evidence first (CPU, memory, disk, sensors). No changes yet.",
    steps,
    playbookId: "doctor.running_hot.v1",
  };
}

app.whenReady().then(() => {
  if (featureFlags.structuredSessionV1) {
    const rootDir = path.join(app.getPath("userData"), "structured-session-v1");
    structuredSessionStore = new StructuredSessionStore(rootDir, true);
    ctx.structuredSessionStore = structuredSessionStore;
    withStructuredSessionWrite(() => structuredSessionStore?.init());
  }
  // Load persisted entitlements on startup
  const storedEntitlement = loadEntitlements();
  if (storedEntitlement) {
    applyStoredEntitlement(storedEntitlement);
    console.log(`[license] Restored ${storedEntitlement.tier} tier from persisted entitlement`);
    
    // Soft refresh: re-verify if stale (>24h) and network available
    if (isEntitlementStale(storedEntitlement) && storedEntitlement.customerId) {
      console.log("[license] Entitlement stale (>24h), attempting soft refresh...");
      verifyLicense(storedEntitlement.customerId)
        .then((data) => {
          if (data?.ok) {
            applyVerifiedLicense(data);
            saveEntitlements();
            console.log(`[license] Soft refresh successful: ${currentLicenseTier}`);
          }
        })
        .catch((err) => {
          // Soft failure - keep existing entitlement
          console.warn("[license] Soft refresh failed (offline?):", err instanceof Error ? err.message : String(err));
        });
    }
  }
  registerAllIpc({
    ipcMain,
    app,
    ctx,
    mainPath: __filename,
    repoRoot: REPO_ROOT,
    appProjectRoot: APP_PROJECT_ROOT,
    dirname: __dirname,
    loadThemeRegistryMerged,
    loadSelectedThemeId,
    saveSelectedThemeId,
    loadCustomThemeRegistry,
    validateTheme,
    writeJsonFile,
    customThemesFile: CUSTOM_THEMES_FILE,
    operationalMemory,
    addTranscriptEntry,
    personalityStore,
    verifyLicense,
    applyVerifiedLicense,
    resetLicenseToStarter,
    saveEntitlements,
    shell,
    getLicenseState,
    getCurrentLicenseCustomerId,
    currentPolicyEnv,
    getCurrentRole,
    explainPolicy,
    readTailLines,
    rendererErrorsFile: RENDERER_ERRORS_FILE,
    getSessionTranscript,
    exportTranscript,
    zipFiles,
    showSaveDialogForBundle,
    runUnifiedSearch,
    detectCommandBoundaries,
    ptySessions,
    ptyResizeTimers,
    getPtyModule,
    getDefaultShell,
    resolvePtyCwd,
    safeEnv,
    shellToKind,
    finalizePtyBoundaries,
    closePtyForWebContents,
    safeSend,
    forRendererDisplay,
    isE2E: IS_E2E,
    daemonStatus,
    daemonTasks,
    daemonTaskAdd,
    daemonStart,
    daemonStop,
    makePlan,
    redactTextForPlan: redactText,
    fetchRemotePlan: fetchRemotePlanForIpc,
    allowLocalEngineFallback: ALLOW_LOCAL_ENGINE_FALLBACK,
    newPlanRunId,
    resolveProjectRootSafe,
    ensureStructuredSession,
    runningPlanRuns,
    riskFromPlanStep,
    gateProfileCommand,
    evaluatePolicyGate,
    executeRemotePlan: executeRemotePlanForIpc,
    pipeAgentdSseToRenderer,
    createStreamId,
    startStreamingStepViaEngine,
    haltReasonFromFallbackStep,
    executeStepStreamForIpc,
    streamCancelForIpc,
    streamKillForIpc,
    planStopForIpc,
    orchestratorIssueToPrForIpc,
    orchestratorGraphForIpc,
    orchestratorPrepareBranchForIpc,
    orchestratorCreatePrForIpc,
    orchestratorPrStatusForIpc,
    orchestratorWebhookAuditForIpc,
    orchestratorCiStatusForIpc,
    orchestratorReviewCommentForIpc,
    chatSendForIpc,
    chatExportForIpc,
    doctorPlanForIpc,
    doctorInspectForIpc,
    doctorCollectForIpc,
    doctorInterpretForIpc,
    doctorVerifyForIpc,
    doctorExecuteFixForIpc,
    doctorTranscriptGetForIpc,
    doctorTranscriptExportForIpc,
    workspacePickDirectoryForIpc,
    workspacePickForIpc,
    workspaceDefaultForIpc,
    codeListFilesForIpc,
    codeReadFileForIpc,
    historyImportForIpc,
    sharePreviewForIpc,
    shareCreateForIpc,
    shareListForIpc,
    shareGetForIpc,
    shareRevokeForIpc,
    teamGetForIpc,
    teamActivityForIpc,
    teamCreateInviteForIpc,
    teamListInvitesForIpc,
    teamAcceptInviteForIpc,
    teamRevokeInviteForIpc,
    teamSetCurrentUserForIpc,
    teamUpsertMemberForIpc,
    teamRemoveMemberForIpc,
    exportPreviewForIpc,
    exportPublishForIpc,
    auditExportForIpc,
    devtoolsToggleForIpc,
    pingForIpc,
    diagnoseHotForIpc,
    planForIpc,
    playbooksGetForIpc,
    playbookExecuteForIpc,
    redactionPreviewForIpc,
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  for (const id of ptySessions.keys()) {
    closePtyForWebContents(id);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
