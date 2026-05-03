import { app, BrowserWindow, ipcMain, type WebContents, dialog, shell } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { verifyLicense } from "./license.js";
import { featureFlags } from "./feature-flags.js";
import { StructuredSessionStore } from "./structured-session.js";
import { PersonalityStore } from "./personality.js";
import { redactText } from "@rinawarp/safety/redaction";
import { type ShellKind, detectCommandBoundaries } from "./prompt-boundary.js";
import { defaultProfileForProject, gateCommandRun, summarizeProfile } from "./agent-profile.js";
import { loadProjectRules, rulesToSystemBlock } from "./rules-loader.js";
import { riskFromPlanStep } from "./plan-risk.js";
import { haltReasonFromFallbackStep } from "./plan-fallback.js";
import type { AppContext } from "./main/context.js";
import { registerAllIpc } from "./main/ipc/registerAllIpc.js";
import { createAgentdIpcHandlers } from "./main/ipc/agentdIpcHandlers.js";
import { createMainIpcHandlers } from "./main/ipc/mainIpcHandlers.js";
import { createThemeRegistryRuntime } from "./main/theme-registry.js";
import { createUnifiedSearchRuntime } from "./main/unified-search.js";
import { normalizeProjectRoot, resolveProjectRootSafe } from "./main/project-root.js";
import { resolveResourcePath as resolveResourcePathFromRoots } from "./main/resource-paths.js";
import { getCurrentRole as getCurrentRoleFromTeam, getCurrentUserEmail as getCurrentUserEmailFromTeam, hasRoleAtLeast } from "./main/roles.js";
import { readJsonIfExists, writeJsonFile } from "./main/json-storage.js";
import { installAppContextMenu } from "./main/app-menu.js";
import {
  AGENTD_AUTH_TOKEN,
  AGENTD_BASE_URL,
  ALLOW_LOCAL_ENGINE_FALLBACK,
  IS_E2E,
  TOP_CPU_CMD_SAFE,
  TOP_CPU_CMD_SAFE_SHORT,
  TOP_MEM_CMD_SAFE,
  createProjectConfig,
  createUserDataPathBuilders,
  loadDevEnvFiles,
} from "./main/project-config.js";
import {
  createLicenseEntitlementRuntime,
  type LicenseRuntimeState,
} from "./main/license-entitlement.js";
import { createSupportBundleSaveDialog } from "./main/support-bundle.js";
import {
  ensureStructuredSession as ensureStructuredSessionSafe,
  withStructuredSessionWrite as withStructuredSessionWriteSafe,
} from "./main/structured-status.js";
import { defaultMainWindowBounds } from "./main/window-state.js";
import {
  createTeamStorage,
  type Role,
  type ShareRecord,
  type TeamActivityAction,
  type TeamActivityRecord,
  type TeamInviteRecord,
} from "./main/team-storage.js";
import { readTailLines } from "./main/tail-lines.js";
import { zipFiles } from "./main/zip.js";
import {
  canonicalizePath,
  isWithinRoot,
} from "./security/projectRoot.js";
import {
  InlineRinaRunStore,
  type InlineRinaAction as PersistedInlineRinaAction,
  type InlineRinaTriggerType,
} from "./main/inline-rina-store.js";
import { detectTerminalFailure } from "./main/inline-rina.js";
import { getRinaUsageStatus } from "./main/rina-usage-meter.js";

const {
  filename: __filename,
  dirname: __dirname,
  appProjectRoot: APP_PROJECT_ROOT,
  repoRoot: REPO_ROOT,
} = createProjectConfig(import.meta.url);

loadDevEnvFiles({
  appProjectRoot: APP_PROJECT_ROOT,
  isPackaged: app.isPackaged,
  isE2E: IS_E2E,
});

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
let inlineRinaRunStore: InlineRinaRunStore | null = null;
const pendingInlineRinaRuns = new Map<number, Array<{ runId: string; command: string }>>();
const personalityStore = new PersonalityStore();
const ctx: AppContext = {
  structuredSessionStore: null,
  lastLoadedThemePath: null,
  lastLoadedPolicyPath: null,
};

// Runtime entitlement state (authoritative for local execution gating)
const licenseRuntimeState: LicenseRuntimeState = {
  tier: "starter",
  token: null,
  expiresAt: null,
  customerId: null,
  status: "inactive",
};
if (app.isPackaged && process.env.ELECTRON_DISABLE_SANDBOX === "1") {
  console.warn("[security] Ignoring ELECTRON_DISABLE_SANDBOX in packaged builds.");
  delete process.env.ELECTRON_DISABLE_SANDBOX;
}

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

let cachedPolicy: ParsedPolicy | undefined;
const userDataPaths = createUserDataPathBuilders(() => app.getPath("userData"));
const THEME_SELECTION_FILE = userDataPaths.themeSelectionFile;
const CUSTOM_THEMES_FILE = userDataPaths.customThemesFile;
const INLINE_RINA_RUNS_FILE = userDataPaths.inlineRinaRunsFile;
function resolveResourcePath(relPath: string, devBase: "repo" | "app"): string {
  return resolveResourcePathFromRoots(relPath, devBase, {
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

const showSaveDialogForBundle = createSupportBundleSaveDialog({ isE2E: IS_E2E });
const themeRegistryRuntime = createThemeRegistryRuntime({
  customThemesFile: CUSTOM_THEMES_FILE,
  themeSelectionFile: THEME_SELECTION_FILE,
  readJsonIfExists,
  writeJsonFile,
  resolveResourcePath,
  warnIfUnexpectedPackagedResource,
  setLastLoadedThemePath: (themePath) => {
    ctx.lastLoadedThemePath = themePath;
  },
});
const loadThemeRegistryMerged = themeRegistryRuntime.loadThemeRegistryMerged;
const loadSelectedThemeId = themeRegistryRuntime.loadSelectedThemeId;
const saveSelectedThemeId = themeRegistryRuntime.saveSelectedThemeId;
const loadCustomThemeRegistry = themeRegistryRuntime.loadCustomThemeRegistry;
const validateTheme = themeRegistryRuntime.validateTheme;

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

function currentPolicyEnv(): PolicyEnv {
  const raw = (process.env.RINAWARP_ENV || process.env.NODE_ENV || "dev").toLowerCase();
  if (raw.includes("prod")) return "prod";
  if (raw.includes("stag")) return "staging";
  return "dev";
}

function parseRuleBlock(block: string): PolicyRule | null {
  const id = block.match(/-\s+id:\s*([^\n]+)/)?.[1]?.trim();
  const action = block.match(/\n\s*action:\s*([a-z_]+)/)?.[1]?.trim() as PolicyAction | undefined;
  if (!id || !action) return null;
  const approval = block.match(/\n\s*approval:\s*([a-z_]+)/)?.[1]?.trim() as PolicyApproval | undefined;
  const typedPhrase = block.match(/\n\s*typed_phrase:\s*"?([^\n"]+)"?/)?.[1]?.trim();
  const message = block.match(/\n\s*message:\s*"?([^\n"]+)"?/)?.[1]?.trim();

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
  if (cachedPolicy !== undefined) return cachedPolicy;

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
    throw new Error(`Command policy file not found: ${policyPath}`);
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
  const fallbackAction = (fallbackSection.match(/\n\s*action:\s*([a-z_]+)/)?.[1]?.trim() as PolicyAction | undefined) || "require_approval";
  const fallbackApproval = fallbackSection.match(/\n\s*approval:\s*([a-z_]+)/)?.[1]?.trim() as PolicyApproval | undefined;
  const fallbackPhrase = fallbackSection.match(/\n\s*typed_phrase:\s*"?([^\n"]+)"?/)?.[1]?.trim();
  const fallbackMessage = fallbackSection.match(/\n\s*message:\s*"?([^\n"]+)"?/)?.[1]?.trim();

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
  policyLoadedFrom?: string | null;
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
    policyLoadedFrom: ctx.lastLoadedPolicyPath,
  };
}

const licenseEntitlementRuntime = createLicenseEntitlementRuntime({
  state: licenseRuntimeState,
  getUserDataPath: () => app.getPath("userData"),
  isPackaged: () => app.isPackaged,
  readJsonIfExists,
  writeJsonFile,
});
const getCurrentPlanId = licenseEntitlementRuntime.getCurrentPlanId;
const getCurrentPlanFeatures = licenseEntitlementRuntime.getCurrentPlanFeatures;
const currentPlanHasFeature = licenseEntitlementRuntime.currentPlanHasFeature;
const applyVerifiedLicense = licenseEntitlementRuntime.applyVerifiedLicense;
const resetLicenseToStarter = licenseEntitlementRuntime.resetLicenseToStarter;
const getLicenseState = licenseEntitlementRuntime.getLicenseState;
const getCurrentLicenseCustomerId = licenseEntitlementRuntime.getCurrentLicenseCustomerId;
const saveEntitlements = licenseEntitlementRuntime.saveEntitlements;
const loadEntitlements = licenseEntitlementRuntime.loadEntitlements;
const applyStoredEntitlement = licenseEntitlementRuntime.applyStoredEntitlement;
const isEntitlementStale = licenseEntitlementRuntime.isEntitlementStale;

function buildAgentdHeaders(opts?: { includeLicenseToken?: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (AGENTD_AUTH_TOKEN) {
    headers.authorization = `Bearer ${AGENTD_AUTH_TOKEN}`;
  }
  if (opts?.includeLicenseToken && licenseRuntimeState.token) {
    headers["x-rinawarp-license-token"] = licenseRuntimeState.token;
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
  withStructuredSessionWriteSafe(() => structuredSessionStore, fn);
}

function ensureStructuredSession(args: { source: string; projectRoot?: string; preferredId?: string }): string | null {
  return ensureStructuredSessionSafe(() => structuredSessionStore, args);
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
const SHARES_FILE = userDataPaths.sharesFile;
const TEAM_FILE = userDataPaths.teamFile;
const TEAM_INVITES_FILE = userDataPaths.teamInvitesFile;
const TEAM_ACTIVITY_FILE = userDataPaths.teamActivityFile;
const RENDERER_ERRORS_FILE = userDataPaths.rendererErrorsFile;
const teamStorage = createTeamStorage({
  sharesFile: SHARES_FILE,
  teamFile: TEAM_FILE,
  teamInvitesFile: TEAM_INVITES_FILE,
  teamActivityFile: TEAM_ACTIVITY_FILE,
});
const loadSharesDb = teamStorage.loadSharesDb;
const saveSharesDb = teamStorage.saveSharesDb;
const loadTeamDb = teamStorage.loadTeamDb;
const saveTeamDb = teamStorage.saveTeamDb;
const loadTeamInvitesDb = teamStorage.loadTeamInvitesDb;
const saveTeamInvitesDb = teamStorage.saveTeamInvitesDb;
const loadTeamActivity = teamStorage.loadTeamActivity;
function getCurrentRole(): Role {
  return getCurrentRoleFromTeam(loadTeamDb);
}
function getCurrentUserEmail(): string {
  return getCurrentUserEmailFromTeam(loadTeamDb);
}
function appendTeamActivity(action: TeamActivityAction, target: string, details?: TeamActivityRecord["details"]) {
  teamStorage.appendTeamActivity({
    action,
    target,
    details,
    actor: getCurrentUserEmail(),
    actorRole: getCurrentRole(),
  });
}
const unifiedSearchRuntime = createUnifiedSearchRuntime({
  getTranscriptEntries: () => sessionState.entries,
  getStructuredSessionStore: () => structuredSessionStore,
  loadSharesDb,
  getCurrentRole,
  hasRoleAtLeast,
});
const runUnifiedSearch = unifiedSearchRuntime.runUnifiedSearch;
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
    const failure = detectTerminalFailure(String(b.output || ""));
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
        ok: !failure.failed,
        code: null,
        cancelled: false,
        error: failure.failed ? failure.summary || null : null,
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
      ok: !failure.failed,
    });
    const pending = pendingInlineRinaRuns.get(webContents.id) || [];
    const pendingIndex = pending.findIndex((item) => item.command === command);
    if (pendingIndex !== -1) {
      const [matched] = pending.splice(pendingIndex, 1);
      if (matched?.runId) {
        inlineRinaRunStore?.updateRun(matched.runId, {
          execution_exit_code: failure.failed ? 1 : 0,
        });
      }
      if (pending.length) pendingInlineRinaRuns.set(webContents.id, pending);
      else pendingInlineRinaRuns.delete(webContents.id);
    }
    safeSend(webContents, "rina:pty:boundary", {
      streamId,
      command,
      cwd: session.cwd,
      output: String(b.output || ""),
      failed: failure.failed,
      failureSummary: failure.summary || "",
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
    license: licenseRuntimeState.tier,
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
  const bounds = defaultMainWindowBounds();
  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Chromium renderer sandboxing is kept on in normal app runs, but the
      // Linux E2E environment here cannot boot Electron reliably with it on.
      sandbox: !IS_E2E
    }
  });

  const webContentsId = win.webContents.id;
  win.loadFile(path.join(__dirname, "renderer.html"));
  installAppContextMenu(win);
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
    license: licenseRuntimeState.tier,
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

app.whenReady().then(() => {
  inlineRinaRunStore = new InlineRinaRunStore(INLINE_RINA_RUNS_FILE());
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
            console.log(`[license] Soft refresh successful: ${licenseRuntimeState.tier}`);
          }
        })
        .catch((err) => {
          // Soft failure - keep existing entitlement
          console.warn("[license] Soft refresh failed (offline?):", err instanceof Error ? err.message : String(err));
        });
    }
  }
  const mainIpcHandlers = createMainIpcHandlers({
    ptySessions,
    getDefaultPtyCwd,
    resolveProjectRootSafe,
    listProjectFilesSafe,
    readProjectFileSafe,
    importShellHistory,
    diagnoseHotLinux,
    addTranscriptEntry,
    makePlan,
    PLAYBOOKS,
    structuredSessionStoreRef: () => structuredSessionStore,
    buildAuditExportText,
    pruneExportPreviewTokens,
    newExportPreviewId,
    exportPreviewTokens,
    EXPORT_PREVIEW_TTL_MS,
    getCurrentUserEmail,
    hashText,
    pruneSharePreviewTokens,
    newSharePreviewId,
    SHARE_PREVIEW_TTL_MS,
    sharePreviewTokens,
    getCurrentRole,
    hasRoleAtLeast,
    loadSharesDb,
    saveSharesDb,
    appendTeamActivity,
    currentPlanHasFeature,
    loadTeamDb,
    saveTeamDb,
    loadTeamInvitesDb,
    saveTeamInvitesDb,
    loadTeamActivity,
    gateProfileCommand,
    evaluatePolicyGate,
    redactForModel,
    sanitizeForPersistence,
    defaultProfileForProject,
    loadProjectRules,
    rulesToSystemBlock,
    summarizeProfile,
    getCurrentPlanId,
    inlineRinaRunStoreRef: () => inlineRinaRunStore,
    pendingInlineRinaRuns,
  });
  const agentdIpcHandlers = createAgentdIpcHandlers({
    agentdJson,
    getCurrentRole,
    hasRoleAtLeast,
  });
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
    devtoolsToggleForIpc,
    isE2E: IS_E2E,
    makePlan,
    redactTextForPlan: redactText,
    allowLocalEngineFallback: ALLOW_LOCAL_ENGINE_FALLBACK,
    newPlanRunId,
    resolveProjectRootSafe,
    ensureStructuredSession,
    runningPlanRuns,
    riskFromPlanStep,
    gateProfileCommand,
    evaluatePolicyGate,
    pipeAgentdSseToRenderer,
    createStreamId,
    startStreamingStepViaEngine,
    haltReasonFromFallbackStep,
    executeStepStreamForIpc,
    streamCancelForIpc,
    streamKillForIpc,
    planStopForIpc,
    ...agentdIpcHandlers,
    ...mainIpcHandlers,
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
