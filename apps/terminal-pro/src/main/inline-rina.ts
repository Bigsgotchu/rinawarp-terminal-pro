import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildRinaCloudWorkspace } from "./rina-cloud-context.js";
import {
  cloudResponseToInlineResult,
  getRinaCloudConfig,
  RinaCloudError,
  type RinaCloudClientLike,
} from "./rina-cloud-client.js";
import { getRinaCloudClientWithStoredToken } from "./rina-cloud-account.js";
import type { RinaExecutionRecord } from "@rinawarp/rina-core";
import type { RinaAgentStreamEvent } from "./rina-agent.js";
import { submitUiPrompt } from "./assistant/rinaIntentLoop.js";
import { recordAgentRunStarted } from "./rina-usage-meter.js";
import { resolveSharedWorkspaceCwd } from "./runtime/runtimeAccess.js";
import type { RinaPlan } from "./rina-usage-limits.js";

const execFileAsync = promisify(execFile);

export type InlineRinaRequest = {
  prompt: string;
  projectRoot?: string;
  entitlementPlan?: RinaPlan;
  action?: "generateCommand" | "debugCommandFailure" | "explainSelection" | "suggestNextCommand";
  selectedText?: string;
  triggerType?: "input" | "failure" | "selection";
  sourceText?: string;
};

export type InlineRinaResult = {
  explanation: string;
  command: string | null;
  risk: "low" | "medium" | "high";
  confirmation: boolean;
  confirmationMessage?: string;
  pendingApproval?: {
    kind: "command" | "file_patch";
    payload: unknown;
  };
  agentEvents?: RinaAgentStreamEvent[];
  usage?: {
    model: string | null;
    promptTokens: number | null;
    responseTokens: number | null;
    totalTokens: number | null;
  };
};

export type TerminalFailureSignal = {
  failed: boolean;
  summary?: string;
};

type PtySessionLike = {
  cwd?: string;
  transcriptBuffer?: string;
};

type InlineRinaRisk = InlineRinaResult["risk"];

type RepoContext = {
  cwd: string;
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "unknown";
  importantFiles: string[];
  fileSummaries: Array<{ path: string; summary: string }>;
  gitStatus: string | null;
  recentPtyTranscript: string[];
  recentCommands: string[];
  lastCommand: string | null;
  lastError: string | null;
  action: InlineRinaRequest["action"];
  triggerType: InlineRinaRequest["triggerType"];
  selectedText: string | null;
};

type ProjectPackageInfo = {
  name?: string;
  description?: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
};

type ProjectSnapshot = {
  cwd: string;
  packageManager: RepoContext["packageManager"];
  packageInfo: ProjectPackageInfo | null;
  importantFiles: string[];
  shallowFiles: string[];
  readmeSummary: string | null;
};

type ModelOutput = {
  explanation: string;
  command: string | null;
  risk: InlineRinaRisk;
};

type EnvMockOutput = Partial<ModelOutput> & {
  usage?: InlineRinaResult["usage"];
};

export type InlineRinaRoute = "direct_chat" | "inline_help" | "agent";

const DIRECT_CHAT_PATTERNS = [
  /^(?:hi|hello|hey)(?:\s+rina)?[!.?]*$/i,
  /^help[!.?]*$/i,
  /^what can you do[?.!]*$/i,
  /^can you help me[?.!]*$/i,
  /^who are you[?.!]*$/i,
];

function stripAnsi(value: string): string {
  return String(value || "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\r/g, "");
}

function tailLines(input: string, maxLines = 20): string {
  return stripAnsi(input)
    .split(/\r?\n/g)
    .filter((line) => line.trim())
    .slice(-maxLines)
    .join("\n");
}

function trimCodeFence(value: string): string {
  return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function parseJsonObject<T>(raw: string): T | null {
  const text = trimCodeFence(raw);
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function extractCommandNotFoundTarget(text: string): string | null {
  const clean = stripAnsi(text);
  const bash = clean.match(/(?:bash|zsh|sh):\s+([^\s:]+): command not found/i);
  if (bash?.[1]) return trimCodeFence(bash[1]);
  const win = clean.match(/'([^']+)' is not recognized as an internal or external command/i);
  if (win?.[1]) return trimCodeFence(win[1]);
  return null;
}

export function detectTerminalFailure(output: string): TerminalFailureSignal {
  const text = stripAnsi(output);
  const lower = text.toLowerCase();
  if (!text.trim()) return { failed: false };
  if (extractCommandNotFoundTarget(text)) {
    return { failed: true, summary: "Command not found" };
  }
  if (/permission denied|eacces/i.test(lower)) {
    return { failed: true, summary: "Permission denied" };
  }
  if (/no such file or directory|enoent/i.test(lower)) {
    return { failed: true, summary: "Missing file or directory" };
  }
  if (/cannot find module|module not found/i.test(lower)) {
    return { failed: true, summary: "Missing module dependency" };
  }
  if (/fatal:\s+not a git repository/i.test(text)) {
    return { failed: true, summary: "Not inside a Git repository" };
  }
  if (/missing script/i.test(lower)) {
    return { failed: true, summary: "Missing package script" };
  }
  if (/already in use|eaddrinuse/i.test(lower)) {
    return { failed: true, summary: "Port already in use" };
  }
  if (/error:|failed|failure|traceback|exception/i.test(lower)) {
    return { failed: true, summary: "Command reported an error" };
  }
  return { failed: false };
}

function detectPackageManager(projectRoot?: string): RepoContext["packageManager"] {
  if (!projectRoot) return "unknown";
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(projectRoot, "bun.lockb")) || fs.existsSync(path.join(projectRoot, "bun.lock"))) return "bun";
  return "unknown";
}

function packageManagerRunCommand(packageManager: RepoContext["packageManager"], script: string): string {
  if (packageManager === "pnpm") return `pnpm ${script}`;
  if (packageManager === "yarn") return `yarn ${script}`;
  if (packageManager === "bun") return `bun run ${script}`;
  return `npm run ${script}`;
}

async function defaultReadFileText(filePath: string): Promise<string> {
  return fsp.readFile(filePath, "utf8");
}

async function defaultListDir(dirPath: string): Promise<string[]> {
  return fsp.readdir(dirPath);
}

async function defaultListDirEntries(dirPath: string): Promise<fs.Dirent[]> {
  return fsp.readdir(dirPath, { withFileTypes: true });
}

async function defaultExecText(command: string, cwd?: string): Promise<string> {
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/bash";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];
  try {
    const { stdout, stderr } = await execFileAsync(shell, args, {
      cwd,
      maxBuffer: 1024 * 1024,
      env: process.env,
      windowsHide: true,
    });
    const output = `${stdout ?? ""}${stderr ?? ""}`.trim();
    return stripAnsi(output || "(no output)");
  } catch (error) {
    const stdout = error && typeof error === "object" && "stdout" in error ? String(error.stdout || "") : "";
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "";
    const output = stripAnsi(`${stdout}${stderr}`.trim());
    throw new Error(output || (error instanceof Error ? error.message : "Command failed"));
  }
}

async function listImportantFiles(
  cwd: string,
  listDir: (dirPath: string) => Promise<string[]>,
): Promise<string[]> {
  const candidates = [
    "package.json",
    "tsconfig.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    "README.md",
    "vite.config.ts",
    "vitest.config.ts",
    "jest.config.ts",
    "playwright.config.ts",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
  ];

  try {
    const names = new Set(await listDir(cwd));
    return candidates.filter((name) => names.has(name)).slice(0, 8);
  } catch {
    return [];
  }
}

async function listProjectFilesMaxDepth(
  cwd: string,
  maxDepth = 2,
  limit = 80,
  listDirEntries: (dirPath: string) => Promise<fs.Dirent[]> = defaultListDirEntries,
): Promise<string[]> {
  const ignoredDirs = new Set([
    ".git",
    "node_modules",
    "dist",
    "dist-electron",
    "out",
    "build",
    ".vite",
    "coverage",
    "test-results",
    "output",
  ]);
  const files: string[] = [];

  async function walk(relativeDir: string, depth: number): Promise<void> {
    if (files.length >= limit || depth > maxDepth) return;
    const absoluteDir = path.join(cwd, relativeDir);
    let entries: fs.Dirent[];
    try {
      entries = await listDirEntries(absoluteDir);
    } catch {
      return;
    }

    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (files.length >= limit) return;
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
      const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) await walk(relativePath, depth + 1);
        continue;
      }
      if (entry.isFile()) files.push(relativePath.replaceAll(path.sep, "/"));
    }
  }

  await walk("", 0);
  return files;
}

function parsePackageInfo(text: string): ProjectPackageInfo | null {
  try {
    const pkg = JSON.parse(text) as {
      name?: string;
      description?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      name: typeof pkg.name === "string" ? pkg.name : undefined,
      description: typeof pkg.description === "string" ? pkg.description : undefined,
      scripts: pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {},
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
    };
  } catch {
    return null;
  }
}

function summarizeReadme(text: string): string | null {
  const lines = stripAnsi(text)
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !/^[-=*`#]+$/.test(line));
  const heading = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "").trim();
  const body = lines.find((line) => !line.startsWith("#") && line.length > 24);
  const summary = [heading, body].filter(Boolean).join(": ");
  return summary ? summary.slice(0, 260) : null;
}

async function buildProjectSnapshot(projectRoot: string): Promise<ProjectSnapshot> {
  const packageManager = detectPackageManager(projectRoot);
  const importantFiles = await listImportantFiles(projectRoot, defaultListDir);
  const shallowFiles = await listProjectFilesMaxDepth(projectRoot);
  let packageInfo: ProjectPackageInfo | null = null;
  let readmeSummary: string | null = null;

  try {
    packageInfo = parsePackageInfo(await defaultReadFileText(path.join(projectRoot, "package.json")));
  } catch {
    packageInfo = null;
  }

  for (const readmeName of ["README.md", "readme.md", "README"]) {
    try {
      readmeSummary = summarizeReadme(await defaultReadFileText(path.join(projectRoot, readmeName)));
      if (readmeSummary) break;
    } catch {
      // Try the next README variant.
    }
  }

  return {
    cwd: projectRoot,
    packageManager,
    packageInfo,
    importantFiles,
    shallowFiles,
    readmeSummary,
  };
}

function summarizeFile(fileName: string, text: string): string {
  const compact = text.replace(/\s+/g, " ").trim().slice(0, 1200);

  if (fileName === "package.json") {
    try {
      const pkg = JSON.parse(text) as {
        name?: string;
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const scripts = Object.keys(pkg.scripts || {}).slice(0, 10);
      const deps = Object.keys(pkg.dependencies || {}).slice(0, 6);
      const devDeps = Object.keys(pkg.devDependencies || {}).slice(0, 6);
      return [
        pkg.name ? `package=${pkg.name}` : null,
        scripts.length ? `scripts=${scripts.join(", ")}` : null,
        deps.length ? `deps=${deps.join(", ")}` : null,
        devDeps.length ? `devDeps=${devDeps.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
    } catch {
      return compact;
    }
  }

  return compact;
}

async function summarizeImportantFiles(
  cwd: string,
  files: string[],
  readFileText: (filePath: string) => Promise<string>,
): Promise<Array<{ path: string; summary: string }>> {
  const summaries: Array<{ path: string; summary: string }> = [];

  for (const file of files) {
    try {
      const fullPath = path.join(cwd, file);
      const text = await readFileText(fullPath);
      summaries.push({ path: file, summary: summarizeFile(file, text) });
    } catch {
      // Ignore unreadable files.
    }
  }

  return summaries;
}

function recentCommandsFromTranscript(transcript: string): string[] {
  const lines = stripAnsi(transcript).split(/\r?\n/g);
  const commands: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const promptMatch = line.match(/^(?:[$>#]|➜)\s+(.+)$/);
    if (promptMatch?.[1]) {
      commands.push(promptMatch[1].trim());
      continue;
    }
    if (/^(git|npm|pnpm|yarn|bun|cargo|go|python|pytest|make|ls|cat|cd)\b/i.test(line)) {
      commands.push(line);
    }
  }
  return Array.from(new Set(commands.slice(-12)));
}

function lastErrorFromTranscript(transcript: string): string | null {
  const lines = stripAnsi(transcript).split(/\r?\n/g).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (/error|failed|failure|exception|traceback|not found|enoent|eacces|fatal:/i.test(line)) {
      return line;
    }
  }
  return null;
}

async function buildRepoContext(args: {
  request: InlineRinaRequest;
  projectRoot: string;
  transcript: string;
}): Promise<RepoContext> {
  const { request, projectRoot, transcript } = args;
  const packageManager = detectPackageManager(projectRoot);
  const importantFiles = await listImportantFiles(projectRoot, defaultListDir);
  const fileSummaries = await summarizeImportantFiles(projectRoot, importantFiles, defaultReadFileText);
  const recentCommands = recentCommandsFromTranscript(transcript);

  let gitStatus: string | null = null;
  try {
    gitStatus = await defaultExecText("git status --short --branch", projectRoot);
  } catch {
    gitStatus = null;
  }

  return {
    cwd: projectRoot,
    packageManager,
    importantFiles,
    fileSummaries,
    gitStatus,
    recentPtyTranscript: stripAnsi(transcript).split(/\r?\n/g).filter((line) => line.trim()).slice(-20),
    recentCommands,
    lastCommand: recentCommands.at(-1) ?? null,
    lastError: lastErrorFromTranscript(transcript),
    action: request.action,
    triggerType: request.triggerType,
    selectedText: request.selectedText?.trim() || null,
  };
}

function buildPrompt(input: string, context: RepoContext): string {
  const fileBlock = context.fileSummaries.length
    ? context.fileSummaries.map((item) => `- ${item.path}: ${item.summary}`).join("\n")
    : "- none";

  const commandBlock = context.recentCommands.length
    ? context.recentCommands.map((item) => `- ${item}`).join("\n")
    : "- none";

  const transcriptBlock = context.recentPtyTranscript.length
    ? context.recentPtyTranscript.map((item) => `- ${item}`).join("\n")
    : "- none";

  return [
    `User request: ${input}`,
    "",
    "Context:",
    `cwd: ${context.cwd}`,
    `packageManager: ${context.packageManager}`,
    `action: ${context.action || "generateCommand"}`,
    `triggerType: ${context.triggerType || "input"}`,
    `lastCommand: ${context.lastCommand ?? "none"}`,
    `lastError: ${context.lastError ?? "none"}`,
    `selectedText: ${context.selectedText ?? "none"}`,
    "",
    "gitStatus:",
    context.gitStatus || "none",
    "",
    "importantFiles:",
    fileBlock,
    "",
    "recentCommands:",
    commandBlock,
    "",
    "recentPtyTranscript:",
    transcriptBlock,
    "",
    "Task:",
    [
      "Decide whether to explain only or propose one concrete terminal command.",
      "When proposing a command, keep it to a single command string.",
      "Do not chain risky commands with && or ; unless truly necessary.",
      "Prefer inspection commands first when confidence is limited.",
      "For requests like 'fix this repo', choose the highest-value next command based on the visible repo state.",
    ].join(" "),
  ].join("\n");
}

function inferRiskFromCommand(command: string | null): InlineRinaRisk {
  if (!command) return "low";

  const normalized = command.toLowerCase();

  if (
    /\b(rm|sudo|chmod|chown|dd|mkfs|shutdown|reboot|killall)\b/.test(normalized) ||
    /\b(git reset --hard|git clean -fd|docker system prune)\b/.test(normalized)
  ) {
    return "high";
  }

  if (
    /\b(npm install|pnpm install|yarn install|bun install|npm run build|pnpm build|pnpm run build|yarn build|yarn run build|bun run build)\b/.test(
      normalized,
    ) ||
    /\b(npm test|pnpm test|pnpm run test|yarn test|yarn run test|bun test)\b/.test(normalized) ||
    /\b(git checkout|git switch|git restore|git apply)\b/.test(normalized)
  ) {
    return "medium";
  }

  return "low";
}

function normalizeLlmResult(
  result: { explanation?: string; command?: string | null; risk?: string },
  usage: InlineRinaResult["usage"],
): InlineRinaResult {
  const command = typeof result.command === "string" && result.command.trim() ? result.command.trim() : null;
  const risk = result.risk === "high" || result.risk === "medium" || result.risk === "low"
    ? result.risk
    : inferRiskFromCommand(command);

  return {
    explanation: String(result.explanation || "I reviewed the repo context and proposed the most likely next step.").trim(),
    command,
    risk,
    confirmation: !!command,
    usage,
  };
}

function inlineResultFromExecutionRecord(record: RinaExecutionRecord): InlineRinaResult {
  const outcome = record.outcome;
  if (!outcome) {
    return {
      explanation: "This request did not produce an execution outcome.",
      command: null,
      risk: "low",
      confirmation: false,
      usage: { model: "rina-runtime", promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }

  const agentEvents = record.events
    .filter((event) => event.type === "execution.progress")
    .map(
      (event): RinaAgentStreamEvent => ({
        type: "assistant_message",
        text: String(event.message || "Execution progress"),
      }),
    );

  return {
    explanation: outcome.explanation,
    command: outcome.command ?? null,
    risk: outcome.risk || "medium",
    confirmation: Boolean(outcome.command || outcome.pendingApproval),
    pendingApproval: outcome.pendingApproval,
    agentEvents,
    usage: {
      model: "rina-runtime",
      promptTokens: null,
      responseTokens: null,
      totalTokens: null,
    },
  };
}

function normalizePlan(entitlement: string | undefined): RinaPlan {
  if (entitlement === "team_seat_monthly") return "team_seat_monthly";
  if (entitlement === "pro_monthly") return "pro_monthly";
  return "free";
}

function shouldUseAgent(input: string): boolean {
  return [
    /fix this repo/i,
    /\b(?:fix|diagnose|debug)\s+(?:the\s+)?typescript\s+error\b/i,
    /\btypescript\s+(?:build\s+)?(?:error|failure|failing|broken)\b/i,
    /\b(?:my\s+)?build\s+(?:is\s+)?(?:failing|failed|broken|erroring)\b/i,
    /\b(?:fix|diagnose|debug)\s+(?:the\s+)?(?:failed\s+)?build\b/i,
    /find why/i,
    /\bdebug\b/i,
    /\brefactor\b/i,
    /\badd tests?\b/i,
    /\bupdate this\b/i,
    /\bchange this\b/i,
    /\bcheck whether this project builds\b/i,
  ].some((pattern) => pattern.test(input));
}

export function chooseInlineRinaRoute(input: string): InlineRinaRoute {
  const prompt = String(input || "").trim();
  if (!prompt) return "inline_help";
  if (DIRECT_CHAT_PATTERNS.some((pattern) => pattern.test(prompt))) return "direct_chat";
  if (shouldUseAgent(prompt)) return "agent";
  return "inline_help";
}

function mockInlineRinaFromEnv(): InlineRinaResult | null {
  const allowEnvMock =
    String(process.env.RINAWARP_E2E || "").trim() === "1" ||
    String(process.env.NODE_ENV || "").trim() === "test";
  if (!allowEnvMock) return null;

  const raw = String(process.env.RINAWARP_INLINE_RINA_TEST_JSON || "").trim();
  const textRaw = String(process.env.RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT || "").trim();
  if (!raw && !textRaw) return null;

  const parsed = parseJsonObject<EnvMockOutput>(raw || textRaw);
  if (!parsed) {
    throw new Error("RINAWARP inline Rina test output did not contain valid JSON.");
  }

  return normalizeLlmResult(
    {
      explanation: parsed.explanation,
      command: parsed.command ?? null,
      risk: parsed.risk,
    },
    parsed.usage || {
      model: "env-mock",
      promptTokens: null,
      responseTokens: null,
      totalTokens: null,
    },
  );
}

async function callRinaCloud(args: {
  prompt: string;
  projectRoot: string;
  cloudClient?: RinaCloudClientLike;
}): Promise<InlineRinaResult> {
  const forcedError = String(process.env.RINAWARP_INLINE_RINA_TEST_ERROR || "").trim();
  if (forcedError) {
    throw new Error(forcedError);
  }

  const cloudClient = args.cloudClient || getRinaCloudClientWithStoredToken();
  const workspace = await buildRinaCloudWorkspace(args.projectRoot);
  const response = await cloudClient.chat({
    message: args.prompt,
    workspace,
    client: {
      appVersion: process.env.npm_package_version || "unknown",
      platform: process.platform,
    },
  });
  return cloudResponseToInlineResult(response);
}

function cloudAccountErrorResult(error: unknown): InlineRinaResult | null {
  if (!(error instanceof RinaCloudError)) return null;
  const upgradeLine = error.upgradeUrl ? `\n\nUpgrade: ${error.upgradeUrl}` : "";
  if (error.status === 401) {
    return {
      explanation: `Sign in to Rina Cloud to use cloud-backed chat. Open Settings -> License, paste your Rina auth token, then try again.${upgradeLine}`,
      command: null,
      risk: "low",
      confirmation: false,
      usage: { model: "rina-cloud", promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }
  if (error.status === 402) {
    return {
      explanation: `Your Rina Cloud subscription is not active. Upgrade to Rina Pro to continue using cloud-backed chat.${upgradeLine}`,
      command: null,
      risk: "low",
      confirmation: false,
      confirmationMessage: "Upgrade required before Rina Cloud can answer.",
      usage: { model: "rina-cloud", promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }
  if (error.status === 429) {
    return {
      explanation: `You've reached today's Rina Cloud usage limit. Upgrade to Rina Pro for more usage, or try again tomorrow.${upgradeLine}`,
      command: null,
      risk: "low",
      confirmation: false,
      confirmationMessage: "Usage limit reached.",
      usage: { model: "rina-cloud", promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }
  return null;
}

function fallbackDebugResponse(args: {
  prompt: string;
  transcript: string;
  projectRoot?: string;
}): InlineRinaResult {
  const transcript = stripAnsi(args.transcript);
  const lower = transcript.toLowerCase();
  const missingCommand = extractCommandNotFoundTarget(transcript);
  if (missingCommand) {
    return {
      explanation: `The last failure looks like a missing executable: \`${missingCommand}\` is not available in this shell or on PATH.`,
      command: `command -v ${missingCommand}`,
      risk: "low",
      confirmation: true,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }
  if (/fatal:\s+not a git repository/i.test(transcript)) {
    return {
      explanation: "The command ran outside a Git repository, so Git could not find repository metadata in the current directory tree.",
      command: "git rev-parse --show-toplevel",
      risk: "low",
      confirmation: true,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }
  if (/missing script/i.test(transcript) && /\bnpm\b|\bpnpm\b|\byarn\b/i.test(transcript)) {
    return {
      explanation: "The package manager could not find the requested script in this workspace's package manifest.",
      command: "cat package.json",
      risk: "low",
      confirmation: true,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }
  if (/permission denied|eacces/i.test(lower) || /no such file or directory|enoent/i.test(lower)) {
    return {
      explanation: "The latest output points to a local environment problem. Inspect the current directory contents before making a change.",
      command: "ls -la",
      risk: "low",
      confirmation: true,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }

  const packageManager = detectPackageManager(args.projectRoot);
  if (/cannot find module|module not found/i.test(lower)) {
    const command = packageManager === "pnpm"
      ? "pnpm install"
      : packageManager === "yarn"
        ? "yarn install"
        : packageManager === "bun"
          ? "bun install"
          : "npm install";
    return {
      explanation: "The runtime reported a missing module dependency. The most likely next move is to restore workspace dependencies.",
      command,
      risk: "medium",
      confirmation: true,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }

  return {
    explanation: `I inspected the latest terminal output for "${args.prompt}", but the failure signal is still too weak to propose a trustworthy command. Try selecting the exact error text or rerun the command so I can explain it inline.`,
    command: null,
    risk: "low",
    confirmation: false,
    usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
  };
}

function fallbackGenerateResponse(prompt: string): InlineRinaResult {
  return {
    explanation: unsupportedCapabilityResponse(prompt),
    command: null,
    risk: "low",
    confirmation: false,
    usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
  };
}

function isDangerousActionPrompt(prompt: string): boolean {
  return [
    /\bdelete\b.*\b(?:home directory|home folder|entire home|~\/?|\/home)\b/i,
    /\bremove\b.*\b(?:home directory|home folder|entire home|~\/?|\/home)\b/i,
    /\brm\s+-rf\s+(?:\/|~|~\/|\$HOME|\/home\b)/i,
    /\bsudo\s+rm\s+-rf\b/i,
    /\b(?:wipe|format|erase)\b.*\b(?:disk|drive|filesystem|computer|machine)\b/i,
    /\bmkfs(?:\.[a-z0-9]+)?\b/i,
    /\bdd\s+if=.*\bof=\/dev\//i,
    /\bdocker\s+(?:volume|system)\s+prune\b.*\b(?:--force|-f)\b/i,
    /\bdestroy\b.*\b(?:docker volumes|database|production|all data)\b/i,
    /\b(?:steal|exfiltrate|dump|print)\b.*\b(?:credentials|passwords|tokens|secrets|ssh keys|api keys)\b/i,
  ].some((pattern) => pattern.test(prompt));
}

function dangerousActionRefusal(prompt: string): InlineRinaResult {
  const lower = prompt.toLowerCase();
  const explanation = /\bhome\b|~|\$HOME|\/home/.test(lower)
    ? "I can't help delete your home directory because that would be destructive and unsafe.\n\nRina only performs approved actions intended to recover or improve your development environment safely."
    : /\bcredentials|passwords|tokens|secrets|ssh keys|api keys\b/.test(lower)
      ? "I can't help extract credentials, tokens, passwords, or secrets. That would put your accounts and systems at risk.\n\nI can help inspect configuration safely, redact sensitive values, or explain how to rotate exposed credentials."
      : "I can't help with that destructive action because it could permanently damage your system or data.\n\nRina only performs approved actions intended to recover or improve your development environment safely.";
  return {
    explanation,
    command: null,
    risk: "high",
    confirmation: false,
    confirmationMessage: "Destructive action blocked.",
    usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
  };
}

function unsupportedCapabilityResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/\bbuild\b|\bnpm run\b|\bpnpm build\b|\btest failed\b/.test(lower)) {
    return "I don't yet support full build recovery in this workflow, but I can still help safely.\n\nShare or rerun the exact build log and I can inspect the failure, identify the likely script, and propose the next approval-gated fix without changing files automatically.";
  }
  if (/\bdeploy|release|publish|rollback\b/.test(lower)) {
    return "I don't yet support full deployment recovery in this workflow.\n\nI can still inspect deploy scripts and configuration, then explain the safest next step before anything changes.";
  }
  return `I don't have a complete workflow for "${prompt}" yet, but I can still stay useful.\n\nI can inspect disk usage, check a port, summarize this repo, explain how to run it, or inspect build logs before suggesting any safe next step.`;
}

function isProjectQuestion(prompt: string): boolean {
  const value = String(prompt || "").trim();
  return [
    /\bwhat does (?:this|the) project do\b/i,
    /\bwhat is (?:this|the) project\b/i,
    /\bhow do i run (?:this|the) (?:app|project)\b/i,
    /\bhow (?:to|do i) start (?:this|the) (?:app|project)\b/i,
    /\bwhere is (?:the )?build script\b/i,
    /\bwhat are (?:the )?main packages\b/i,
    /\bwhat packages does (?:this|the) project use\b/i,
    /\bwhere is (?:authentication|auth) handled\b/i,
    /\bexplain (?:the )?architecture\b/i,
    /\bhow is (?:this|the) project structured\b/i,
    /\bwhy are tests failing\b/i,
    /\bwhy (?:are|do) (?:the )?tests fail\b/i,
  ].some((pattern) => pattern.test(value));
}

function scriptNamesMatching(scripts: Record<string, string>, patterns: RegExp[]): string[] {
  return Object.keys(scripts).filter((name) => patterns.some((pattern) => pattern.test(name)));
}

function pickScriptName(scripts: Record<string, string>, exactNames: string[], fuzzyPatterns: RegExp[]): string | null {
  const names = Object.keys(scripts);
  for (const exact of exactNames) {
    if (names.includes(exact)) return exact;
  }
  return names.find((name) => fuzzyPatterns.some((pattern) => pattern.test(name))) || null;
}

async function deterministicProjectQuestionResponse(prompt: string, projectRoot: string): Promise<InlineRinaResult | null> {
  if (!isProjectQuestion(prompt)) return null;

  const snapshot = await buildProjectSnapshot(projectRoot);
  const pkg = snapshot.packageInfo;
  const scripts = pkg?.scripts || {};
  const scriptNames = Object.keys(scripts);
  const usage = { model: null, promptTokens: null, responseTokens: null, totalTokens: null };
  const value = prompt.toLowerCase();

  if (/\bwhere is (?:the )?build script\b/.test(value)) {
    const buildScripts = scriptNamesMatching(scripts, [/^build$/, /build/i]);
    const explanation = buildScripts.length
      ? `The build script is in \`package.json\` under \`scripts\`: ${buildScripts.map((name) => `\`${name}\` -> \`${scripts[name]}\``).join(", ")}. I inspected the workspace root, package manifest, and shallow file list before answering.`
      : `I inspected the workspace root, package manifest, and shallow file list, but I don't see a build script in \`package.json\`. Visible scripts: ${scriptNames.length ? scriptNames.map((name) => `\`${name}\``).join(", ") : "none"}.`;
    return { explanation, command: null, risk: "low", confirmation: false, usage };
  }

  if (/\bmain packages|packages does\b/.test(value)) {
    const dependencyNames = (pkg?.dependencies || []).slice(0, 10);
    const devDependencyNames = (pkg?.devDependencies || []).slice(0, 10);
    const dependencyLine = dependencyNames.length
      ? `Runtime packages: ${dependencyNames.map((name) => `\`${name}\``).join(", ")}.`
      : "I don't see runtime dependencies in `package.json`.";
    const devDependencyLine = devDependencyNames.length
      ? `Development packages: ${devDependencyNames.map((name) => `\`${name}\``).join(", ")}.`
      : "I don't see development dependencies in `package.json`.";
    return {
      explanation: [
        pkg?.name ? `For \`${pkg.name}\`, I inspected \`package.json\` for package usage.` : "I inspected `package.json` for package usage.",
        dependencyLine,
        devDependencyLine,
      ].join(" "),
      command: null,
      risk: "low",
      confirmation: false,
      usage,
    };
  }

  if (/\bhow (?:do i|to) (?:run|start)\b/.test(value)) {
    const primary = pickScriptName(scripts, ["dev", "start", "serve", "preview"], [/^dev[:_-]/, /^start[:_-]/, /serve/i, /preview/i]);
    const command = primary ? packageManagerRunCommand(snapshot.packageManager, primary) : null;
    const explanation = primary
      ? `This looks like ${pkg?.name ? `\`${pkg.name}\`` : "a Node-style app"}. To run it locally, use the \`${primary}\` script from \`package.json\`: \`${scripts[primary]}\`. I found ${snapshot.packageManager === "unknown" ? "no lockfile, so npm is the safest default" : `a ${snapshot.packageManager} workspace`}.`
      : `I inspected the project files but couldn't find a clear \`dev\`, \`start\`, \`serve\`, or \`preview\` script in \`package.json\`. Visible scripts: ${scriptNames.length ? scriptNames.map((name) => `\`${name}\``).join(", ") : "none"}.`;
    return { explanation, command, risk: command ? "medium" : "low", confirmation: !!command, usage };
  }

  if (/\bwhere is (?:authentication|auth) handled\b/.test(value)) {
    const authFiles = snapshot.shallowFiles
      .filter((file) => /\bauth\b|login|session|token|license/i.test(file))
      .slice(0, 12);
    const authPackages = [
      ...(pkg?.dependencies || []),
      ...(pkg?.devDependencies || []),
    ].filter((name) => /auth|oauth|passport|clerk|next-auth|supabase|firebase|stripe|jwt/i.test(name));
    const explanation = [
      "I inspected the visible file tree and package metadata for authentication signals.",
      authFiles.length
        ? `Likely auth-related files: ${authFiles.map((file) => `\`${file}\``).join(", ")}.`
        : "I don't see obvious auth-named files in the shallow file list.",
      authPackages.length
        ? `Auth-adjacent packages: ${authPackages.map((name) => `\`${name}\``).join(", ")}.`
        : "I don't see obvious auth packages in `package.json`.",
      "I did not open secrets or execute anything.",
    ].join(" ");
    return { explanation, command: null, risk: "low", confirmation: false, usage };
  }

  if (/\btests? fail|tests? failing\b/.test(value)) {
    const primary = pickScriptName(scripts, ["test"], [/^test[:_-]/, /test/i]);
    const command = primary ? packageManagerRunCommand(snapshot.packageManager, primary) : null;
    const explanation = primary
      ? `I don't have a failing test log yet, but I found the test entry point in \`package.json\`: \`${primary}\` -> \`${scripts[primary]}\`. Run it first so Rina can inspect the exact failure output before suggesting any edit.`
      : `I don't have a failing test log yet, and I don't see a test script in \`package.json\`. I inspected the shallow file list and found ${snapshot.shallowFiles.slice(0, 12).map((file) => `\`${file}\``).join(", ") || "no obvious test files"}.`;
    return { explanation, command, risk: command ? "medium" : "low", confirmation: !!command, usage };
  }

  const languageHints = [
    pkg ? "Node/JavaScript package manifest" : null,
    snapshot.importantFiles.includes("tsconfig.json") ? "TypeScript config" : null,
    snapshot.importantFiles.includes("vite.config.ts") ? "Vite config" : null,
    snapshot.importantFiles.includes("playwright.config.ts") ? "Playwright config" : null,
    snapshot.importantFiles.includes("pyproject.toml") ? "Python project config" : null,
    snapshot.importantFiles.includes("Cargo.toml") ? "Rust project config" : null,
    snapshot.importantFiles.includes("go.mod") ? "Go module" : null,
  ].filter(Boolean);
  const scriptSummary = scriptNames.length ? `Scripts include ${scriptNames.slice(0, 8).map((name) => `\`${name}\``).join(", ")}.` : "I didn't find package scripts.";
  const topLevelDirs = Array.from(new Set(snapshot.shallowFiles
    .filter((file) => file.includes("/"))
    .map((file) => file.split("/")[0])
    .filter(Boolean)))
    .slice(0, 8);
  const fileSummary = snapshot.shallowFiles.slice(0, 12).map((file) => `\`${file}\``).join(", ");

  if (/\barchitecture|structured\b/.test(value)) {
    const explanation = [
      pkg?.name ? `Architecture overview for \`${pkg.name}\`.` : "Architecture overview from the visible workspace files.",
      languageHints.length ? `Stack signals: ${languageHints.join(", ")}.` : null,
      topLevelDirs.length ? `Main top-level areas: ${topLevelDirs.map((dir) => `\`${dir}/\``).join(", ")}.` : null,
      scriptSummary,
      fileSummary ? `Representative files: ${fileSummary}.` : null,
      "This is a read-only project explanation; no files were changed.",
    ].filter(Boolean).join(" ");
    return { explanation, command: null, risk: "low", confirmation: false, usage };
  }

  const explanation = [
    pkg?.name ? `This project appears to be \`${pkg.name}\`.` : "I inspected this workspace to understand what it is.",
    pkg?.description ? pkg.description : snapshot.readmeSummary,
    languageHints.length ? `Signals: ${languageHints.join(", ")}.` : null,
    scriptSummary,
    fileSummary ? `Notable files near the top: ${fileSummary}.` : null,
  ].filter(Boolean).join(" ");
  return { explanation, command: null, risk: "low", confirmation: false, usage };
}

function deterministicFirstRunResponse(prompt: string): InlineRinaResult | null {
  const value = String(prompt || "").trim().toLowerCase();
  const usage = { model: null, promptTokens: null, responseTokens: null, totalTokens: null };

  if (/\b(?:disk|space|storage)\b/.test(value) && /\b(?:full|using|used|free|left|space)\b/.test(value)) {
    return {
      explanation: "I’ll start with read-only disk evidence: overall filesystem usage, then the largest folders in the current workspace. No cleanup or deletion happens unless you approve a later step.",
      command: "df -h && du -h -d 1 . 2>/dev/null | sort -h | tail -n 12",
      risk: "low",
      confirmation: true,
      usage,
    };
  }

  const portMatch = value.match(/\bport\s+(\d{2,5})\b/) || value.match(/:(\d{2,5})\b/);
  if (portMatch && /\b(?:what|who|which|using|listening|port)\b/.test(value)) {
    const port = portMatch[1];
    return {
      explanation: `I’ll inspect which local process is listening on port ${port}. This is read-only and only reports the process details Rina can see.`,
      command: `lsof -nP -iTCP:${port} -sTCP:LISTEN || ss -ltnp 'sport = :${port}'`,
      risk: "low",
      confirmation: true,
      usage,
    };
  }

  return null;
}

export async function runInlineRina(args: {
  request: InlineRinaRequest;
  session: PtySessionLike | undefined;
}, deps: {
  cloudClient?: RinaCloudClientLike;
} = {}): Promise<InlineRinaResult> {
  const prompt = String(args.request.prompt || "").trim();
  if (!prompt) {
    return {
      explanation: "There was no input to analyze.",
      command: null,
      risk: "low",
      confirmation: false,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }

  const envMock = mockInlineRinaFromEnv();
  if (envMock) {
    return envMock;
  }

  const transcript = tailLines(String(args.session?.transcriptBuffer || ""), 24);
  const projectRoot = resolveSharedWorkspaceCwd(args.request.projectRoot || args.session?.cwd);

  if (isDangerousActionPrompt(prompt)) {
    return dangerousActionRefusal(prompt);
  }

  const firstRunFallback = deterministicFirstRunResponse(prompt);
  if (firstRunFallback) {
    return firstRunFallback;
  }

  if (shouldUseAgent(prompt)) {
    const plan = normalizePlan(args.request.entitlementPlan);
    const usageGate = await recordAgentRunStarted(plan);
    if (!usageGate.ok) {
      return {
        explanation: usageGate.reason,
        command: null,
        risk: "low",
        confirmation: false,
        confirmationMessage: "Upgrade to Pro to continue using repo-fix agent runs.",
        usage: { model: "rina-agent", promptTokens: null, responseTokens: null, totalTokens: null },
      };
    }
    const record = await submitUiPrompt(prompt, projectRoot, {
      projectRoot,
      sessionId: args.request.triggerType || "inline",
    });
    return inlineResultFromExecutionRecord(record);
  }

  try {
    if (deps.cloudClient || getRinaCloudConfig().apiBase) {
      return await callRinaCloud({ prompt, projectRoot, cloudClient: deps.cloudClient });
    }

    const projectQuestionFallback = await deterministicProjectQuestionResponse(prompt, projectRoot);
    if (projectQuestionFallback) {
      return projectQuestionFallback;
    }

    return fallbackGenerateResponse(prompt);
  } catch (error) {
    const accountError = cloudAccountErrorResult(error);
    if (accountError) return accountError;

    const projectQuestionFallback = await deterministicProjectQuestionResponse(prompt, projectRoot);
    if (projectQuestionFallback) {
      return projectQuestionFallback;
    }

    const debugPrompt = /\b(why|fail|failed|failure|broken|error|debug|fix)\b/i.test(prompt);
    if (debugPrompt || detectTerminalFailure(transcript).failed) {
      return fallbackDebugResponse({
        prompt,
        transcript: args.request.selectedText?.trim() || transcript,
        projectRoot,
      });
    }

    const message = error instanceof Error ? error.message : "Unknown model error";
    const fallback = fallbackGenerateResponse(prompt);
    return {
      ...fallback,
      explanation: `Rina Cloud is unavailable. Local recovery workflows still work.\n\n${message}`,
    };
  }
}
