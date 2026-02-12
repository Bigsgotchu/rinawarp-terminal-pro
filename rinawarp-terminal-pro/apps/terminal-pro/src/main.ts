import { app, BrowserWindow, ipcMain, type WebContents, dialog } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { verifyLicense, type LicenseVerifyResponse } from "./license.js";

// ============================================================
// SECURITY: Project Root Validation
// ============================================================
// Allowed workspace roots - constrain execution to these directories
const ALLOWED_WORKSPACE_ROOTS: string[] = [];

/**
 * Check if resolved path is within root using proper path boundaries.
 * Prevents /allowed/root2 bypass attacks.
 */
function isWithinRoot(resolved: string, root: string): boolean {
  const rel = path.relative(root, resolved);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Normalize and validate projectRoot from renderer.
 * Prevents path traversal attacks and arbitrary directory execution.
 */
function normalizeProjectRoot(input: string, workspaceRoot?: string): string {
  const resolved = path.resolve(input);
  const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
  
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Invalid projectRoot: "${input}" is not a valid directory`);
  }
  
  // If workspace root is defined, ensure resolved is within it using proper boundaries
  if (workspaceRoot && !isWithinRoot(resolved, workspaceRoot)) {
    throw new Error(`Invalid projectRoot: "${input}" is outside allowed workspace`);
  }
  
  return resolved;
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

// Runtime entitlement state (authoritative for local execution gating)
let currentLicenseTier: LicenseTier = "starter";
let currentLicenseToken: string | null = null;
let currentLicenseExpiresAt: number | null = null;
let currentLicenseCustomerId: string | null = null;
const AGENTD_BASE_URL = process.env.RINAWARP_AGENTD_URL || "http://127.0.0.1:5055";
const AGENTD_AUTH_TOKEN = process.env.RINAWARP_AGENTD_TOKEN || "";
const ALLOW_LOCAL_ENGINE_FALLBACK = /^(1|true|yes)$/i.test(process.env.RINAWARP_USE_LOCAL_ENGINE_FALLBACK || "");

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
  return tier;
}

function resetLicenseToStarter() {
  currentLicenseTier = "starter";
  currentLicenseToken = null;
  currentLicenseExpiresAt = null;
  currentLicenseCustomerId = null;
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

type Risk = "read" | "safe-write" | "high-impact";

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
      { command: "ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -20", description: "Top CPU processes", timeout: 8000 },
      { command: "free -h", description: "Memory usage", timeout: 5000 },
      { command: "sensors 2>/dev/null || echo 'No sensors available'", description: "Temperature sensors", timeout: 8000 }
    ],
    fixOptions: [
      {
        name: "Identify CPU hogs",
        description: "Find and analyze processes consuming excessive CPU",
        risk: "read",
        commands: ["ps -eo pid,pcpu,pmem,comm,etime --sort=-pcpu | head -15"],
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
      { command: "ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -15", description: "Top processes", timeout: 8000 },
      { command: "cat /proc/loadavg", description: "Detailed load", timeout: 5000 },
      { command: "systemctl status 2>/dev/null | head -20", description: "Systemd status", timeout: 10000 }
    ],
    fixOptions: [
      {
        name: "Check for memory hogs",
        description: "Find processes using most memory",
        risk: "read",
        commands: ["ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -15"],
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

function addTranscriptEntry(entry: TranscriptEntry) {
  sessionState.entries.push(entry);
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
    return JSON.stringify(transcript, null, 2);
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
  
  return text;
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

function createStreamId(): string {
  return `st_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
    "ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -n 15",
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
      { id: "s3", tool: "terminal", command: "ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -10", risk: "read" }
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
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, "renderer.html"));

  // Disable devtools in production for security
  if (app.isPackaged) {
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools();
    });
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
}) {
  const { webContents, streamId, step, confirmed, confirmationText, projectRoot: rawProjectRoot } = args;
  
  // SECURITY: Validate and normalize projectRoot
  const projectRoot = normalizeProjectRoot(rawProjectRoot);
  
  // Source-of-truth risk (avoid drift from classifier vs step.risk)
  const risk = step.risk;

  // 1) High-impact confirmation gate (keeps your UX contract)
  let confirmationToken: ConfirmationToken | undefined;
  if (risk === "high-impact") {
    if (!confirmed) {
      webContents.send("rina:stream:end", {
        streamId,
        ok: false,
        code: null,
        error: "Confirmation required for high-impact step.",
      });
      return;
    }
    if (confirmationText !== "YES") {
      webContents.send("rina:stream:end", {
        streamId,
        ok: false,
        code: null,
        error: 'Typed confirmation must be exactly "YES".',
      });
      return;
    }

    const scope = createConfirmationScope(step);
    confirmationToken = { kind: "explicit", approved: true, scope };
  }

  // 2) Send command meta (unchanged)
  webContents.send("rina:stream:chunk", {
    streamId,
    stream: "meta",
    data: `$ ${step.command}\n`,
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
        webContents.send("rina:stream:chunk", {
          streamId,
          stream: evt.stream,
          data: evt.data,
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

  webContents.send("rina:stream:end", {
    streamId,
    ok: cancelled ? false : report.ok,
    code: exitCode,
    cancelled,
    error,
    report,
  });
}

/**
 * Soft cancellation handler (v1).
 * NOTE: We do NOT kill processes here in v1 unless you define a high-impact process.kill tool.
 */
async function cancelStream(streamId: string): Promise<{ ok: boolean; message: string }> {
  const mappedPlanRunId = streamToPlanRun.get(streamId);
  if (mappedPlanRunId) {
    const st = runningPlanRuns.get(mappedPlanRunId);
    if (st?.agentdPlanRunId) {
      try {
        await agentdJson("/v1/cancel", {
          method: "POST",
          body: { planRunId: st.agentdPlanRunId, streamId, reason: "soft" },
          includeLicenseToken: true,
        });
        return { ok: true, message: "Cancellation requested." };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "Cancellation failed" };
      }
    }
  }

  const entry = running.get(streamId);
  if (!entry) return { ok: false, message: "No running process for that streamId." };

  entry.cancelled = true;

  return { ok: true, message: "Cancellation requested." };
}

// IPC Handlers

// License verification handler
ipcMain.handle("license:verify", async (_event, customerId: string) => {
  try {
    const data = await verifyLicense(customerId);
    if (!data?.ok) {
      resetLicenseToStarter();
      throw new Error("license verification returned non-ok response");
    }
    const effectiveTier = applyVerifiedLicense(data);
    return { ...data, effective_tier: effectiveTier };
  } catch (error) {
    resetLicenseToStarter();
    throw error;
  }
});

// Runtime license state for diagnostics/debug UI (no secret mutation)
ipcMain.handle("license:state", async () => {
  return {
    tier: currentLicenseTier,
    has_token: !!currentLicenseToken,
    expires_at: currentLicenseExpiresAt,
    customer_id: currentLicenseCustomerId,
  };
});

// Directory picker handler
ipcMain.handle("rina:pickDirectory", async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Project Root",
    buttonLabel: "Select Folder"
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
});

// Workspace picker handler (returns structured result)
ipcMain.handle("rina:workspace:pick", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Workspace Folder",
    buttonLabel: "Select"
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false };
  }
  
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle("rina:ping", async () => {
  return { pong: true, timestamp: new Date().toISOString() };
});

ipcMain.handle("rina:diagnoseHot", async () => {
  if (process.platform === "linux") return await diagnoseHotLinux();
  return { platform: process.platform, message: "Tuned for Kali/Linux." };
});

ipcMain.handle("rina:plan", async (_event, intent: string) => {
  addTranscriptEntry({ type: "intent", timestamp: new Date().toISOString(), intent });
  const plan = makePlan(intent);
  addTranscriptEntry({ type: "plan", timestamp: new Date().toISOString(), plan });
  return plan;
});

ipcMain.handle("rina:playbooks:get", async () => {
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
});

ipcMain.handle("rina:playbook:execute", async (_event, playbookId: string, fixIndex: number) => {
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
});

ipcMain.handle("rina:transcript:get", async () => getSessionTranscript());
ipcMain.handle("rina:transcript:export", async (_event, format: "json" | "text") => exportTranscript(format));
ipcMain.handle("rina:transcript:add", async (_event, entry: any) => addTranscriptEntry({ ...entry, timestamp: new Date().toISOString() }));

ipcMain.handle("rina:memory:get", async (_event, category: string) => operationalMemory.getRecent(category));
ipcMain.handle("rina:memory:set", async (_event, category: string, key: string, value: string) => {
  operationalMemory.set(category, key, value);
  addTranscriptEntry({ type: "memory", timestamp: new Date().toISOString(), category, key, value });
});

ipcMain.handle("rina:executeStepStream", async (event, step: ToolStep, confirmed: boolean, confirmationText: string, projectRoot: string) => {
  const streamId = createStreamId();
  
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
      const normalizedRoot = normalizeProjectRoot(projectRoot);
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
              event.sender.send("rina:stream:chunk", {
                streamId,
                stream: payload.stream,
                data: payload.data,
              });
              continue;
            }

            if (eventName === "plan_step_end") {
              const report = payload.report;
              const lastResult = report?.steps?.[report.steps.length - 1]?.result;
              const exitCode = lastResult?.meta?.exitCode ?? null;
              const error = payload.ok ? null : (report?.haltedBecause || lastResult?.error || "Execution failed");
              stepEndSent = true;
              event.sender.send("rina:stream:end", {
                streamId,
                ok: !!payload.ok,
                code: exitCode,
                cancelled: false,
                error,
                report,
              });
              continue;
            }

            if (eventName === "plan_halt") {
              haltedBecause = payload?.reason || "halted";
              continue;
            }

            if (eventName === "plan_run_end" && haltedBecause && !stepEndSent) {
              event.sender.send("rina:stream:end", {
                streamId,
                ok: false,
                code: null,
                cancelled: false,
                error: haltedBecause,
                report: { ok: false, haltedBecause, steps: [] },
              });
            }
          }
        }
      } catch (error) {
        if (!ALLOW_LOCAL_ENGINE_FALLBACK) throw error;
        await startStreamingStepViaEngine({
          webContents: event.sender,
          streamId,
          step,
          confirmed,
          confirmationText,
          projectRoot: normalizedRoot,
        });
      }
    } catch (error) {
      event.sender.send("rina:stream:end", {
        streamId,
        ok: false,
        code: null,
        cancelled: false,
        error: error instanceof Error ? error.message : "Execution failed",
        report: { ok: false, haltedBecause: "execution_failed", steps: [] },
      });
    } finally {
      streamToPlanRun.delete(streamId);
      runningPlanRuns.delete(localPlanRunId);
    }
  })();

  return { streamId };
});

ipcMain.handle("rina:stream:cancel", async (_event, streamId: string) => cancelStream(streamId));

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
          }
          eventSender.send("rina:plan:stepStart", {
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
          eventSender.send("rina:stream:chunk", {
            streamId: payload.streamId,
            stream: payload.stream,
            data: payload.data,
          });
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
          eventSender.send("rina:stream:end", {
            streamId: payload.streamId,
            ok: !!payload.ok,
            code: exitCode,
            cancelled: false,
            error,
            report,
          });
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
ipcMain.handle("rina:plan:stop", async (_event, planRunId: string) => {
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
});

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

ipcMain.handle("rina:doctor:inspect", async (_event, intent: string) => {
  return await doctorInspect(intent);
});

ipcMain.handle("rina:doctor:collect", async (_event, steps: any[], streamCallback: any) => {
  // Create a stream callback for IPC
  const wrappedCallback = (chunk: string, stream: "stdout" | "stderr") => {
    if (streamCallback) {
      // This won't work directly - need to use webContents.send
    }
  };
  return await doctorCollect(steps, undefined);
});

ipcMain.handle(
  "rina:doctor:interpret",
  async (_event, payload: { intent: string; evidence: any }) => {
    return await doctorInterpret(payload);
  }
);

ipcMain.handle(
  "rina:doctor:verify",
  async (_event, payload: { intent: string; before: any; after: any; diagnosis?: any }) => {
    return await doctorVerify(payload);
  }
);

ipcMain.handle(
  "rina:doctor:executeFix",
  async (_event, plan: any, confirmed: boolean, confirmationText: string) => {
    return await doctorExecuteFix(plan, confirmed, confirmationText);
  }
);

ipcMain.handle("rina:doctor:transcript:get", async () => doctorGetTranscript());

ipcMain.handle("rina:doctor:transcript:export", async (_event, format: "json" | "text") =>
  doctorExportTranscript(format)
);

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

// Core chat handler - now uses chat-router.ts
ipcMain.handle("rina:chat:send", async (_event, text: string) => {
  return await chatRouter.handle(text);
});

// Export transcript handler
ipcMain.handle("rina:chat:export", async () => {
  return doctorExportTranscript("text");
});

// Agent IPC handlers (for minimal UI)
ipcMain.handle("agent:plan", async (_event, intent: string) => {
  const plan = makePlan(intent);
  return plan;
});

// ============================================================
// Warp-like Block Handlers
// ============================================================

ipcMain.handle("rina:agent:plan", async (_event, args: { intentText: string; projectRoot: string }) => {
  const { intentText, projectRoot } = args;
  try {
    const resp = await agentdJson<{ ok: true; plan: any }>("/v1/plan", {
      method: "POST",
      body: { intentText, projectRoot },
      includeLicenseToken: false,
    });
    return resp.plan;
  } catch (error) {
    if (!ALLOW_LOCAL_ENGINE_FALLBACK) throw error;

    // Explicit dev fallback only
    const plan = makePlan(intentText, projectRoot);
    const steps = plan.steps.map((s: any) => ({
      tool: "terminal.write",
      stepId: s.id,
      input: {
        command: s.command,
        cwd: projectRoot || process.cwd(),
        timeoutMs: 300_000,
      },
    }));
    return {
      id: plan.id,
      intent: intentText,
      reasoning: plan.reasoning,
      steps,
    };
  }
});

ipcMain.handle("rina:executePlanStream", async (event, args: {
  plan: any[];
  projectRoot: string;
  confirmed: boolean;
  confirmationText: string;
}) => {
  const planRunId = newPlanRunId();
  const runId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const projectRoot = args.projectRoot || process.cwd();

  // Track this plan run for stop functionality
  runningPlanRuns.set(planRunId, { stopped: false });

  // Notify renderer that plan started
  event.sender.send("rina:plan:run:start", { planRunId });

  let haltedStepId: string | null = null;
  let haltReason = "";

  try {
    const execResp = await agentdJson<{ ok: true; planRunId: string }>("/v1/execute-plan", {
      method: "POST",
      body: {
        plan: args.plan,
        projectRoot,
        confirmed: args.confirmed,
        confirmationText: args.confirmationText ?? "",
      },
      includeLicenseToken: true,
    });
    const state = runningPlanRuns.get(planRunId);
    if (state) state.agentdPlanRunId = execResp.planRunId;

    haltReason = (await pipeAgentdSseToRenderer({
      eventSender: event.sender,
      localPlanRunId: planRunId,
      agentdPlanRunId: execResp.planRunId,
      runId,
    })) || "";
  } catch (error) {
    if (!ALLOW_LOCAL_ENGINE_FALLBACK) {
      haltedStepId = args.plan[0]?.stepId ?? null;
      haltReason = error instanceof Error ? error.message : String(error);
    } else {
      for (const step of args.plan) {
        const state = runningPlanRuns.get(planRunId);
        if (!state || state.stopped) {
          haltedStepId = step.stepId;
          haltReason = "stop_requested";
          break;
        }
        const streamId = createStreamId();
        state.currentStreamId = streamId;
        const command = (step.input as any)?.command;
        if (typeof command !== "string") {
          event.sender.send("rina:stream:end", {
            streamId,
            ok: false,
            code: null,
            cancelled: false,
            error: "Invalid step input: missing command",
            report: { ok: false, haltedBecause: "unknown_tool", steps: [] },
          });
          haltedStepId = step.stepId;
          haltReason = "Invalid step input";
          break;
        }
        event.sender.send("rina:plan:stepStart", {
          planRunId,
          runId,
          streamId,
          step: {
            stepId: step.stepId,
            tool: "terminal",
            input: step.input,
          },
        });
        const toolStep = {
          id: step.stepId ?? `step_${streamId}`,
          tool: "terminal" as const,
          command,
          risk: (step.confirmationScope ? "high-impact" : "safe-write") as "read" | "safe-write" | "high-impact",
        };
        await startStreamingStepViaEngine({
          webContents: event.sender,
          streamId,
          step: toolStep,
          confirmed: args.confirmed,
          confirmationText: args.confirmationText ?? "",
          projectRoot,
        });
        state.currentStreamId = undefined;
      }
    }
  } finally {
    // Notify renderer that plan ended
    event.sender.send("rina:plan:run:end", {
      planRunId,
      ok: !haltReason,
      haltedBecause: haltReason || undefined,
    });

    runningPlanRuns.delete(planRunId);
  }

  return { runId, planRunId, haltedStepId, haltReason };
});

// Doctor v1: Read-only evidence collection for diagnosing system issues
type DoctorPlanStep = {
  stepId: string;
  tool: string;
  input: any;
  confirmationScope?: string;
};

ipcMain.handle("rina:doctor:plan", async (_event, args: { projectRoot: string; symptom: string }) => {
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
});

ipcMain.handle("agent:execute", async (_event) => {
  // Execute all steps in the current plan
  const results: { output: string; error?: string }[] = [];
  // This is a placeholder - full implementation would need plan state
  return results;
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
