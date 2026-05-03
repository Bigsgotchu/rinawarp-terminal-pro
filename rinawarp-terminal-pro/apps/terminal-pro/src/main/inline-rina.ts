import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import OpenAI from "openai";
import { runRinaAgent, type RinaAgentResult, type RinaAgentStreamEvent } from "./rina-agent.js";
import { getRinaUsageStatus, recordAgentRunStarted } from "./rina-usage-meter.js";
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

type ModelOutput = {
  explanation: string;
  command: string | null;
  risk: InlineRinaRisk;
};

type EnvMockOutput = Partial<ModelOutput> & {
  usage?: InlineRinaResult["usage"];
};

export type InlineRinaRoute = "direct_chat" | "inline_help" | "agent";

const DEFAULT_MODEL = String(process.env.RINAWARP_OPENAI_MODEL || "gpt-4.1-mini").trim();
const DIRECT_CHAT_PATTERNS = [
  /^(?:hi|hello|hey)(?:\s+rina)?[!.?]*$/i,
  /^help[!.?]*$/i,
  /^what can you do[?.!]*$/i,
  /^can you help me[?.!]*$/i,
  /^who are you[?.!]*$/i,
];

const SYSTEM_PROMPT = [
  "You are Rina, a terminal-native AI assistant inside RinaWarp Terminal Pro.",
  "You help users operate and repair real developer environments safely.",
  "Return JSON only.",
  "Prefer one concrete next step over broad advice.",
  "Only propose a command when it is likely to work in the current repo context.",
  "Do not invent scripts, files, package managers, or tools that are not supported by the visible context.",
  "Use command=null when explanation is more appropriate than execution.",
  "Risk rules:",
  "- low: read-only inspection or clearly safe local checks",
  "- medium: install/build/test/change-local-state commands",
  "- high: destructive, networked, privileged, or irreversible commands",
  "Keep the explanation concise and actionable.",
].join("\n");

function getOpenAiClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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

async function defaultReadFileText(filePath: string): Promise<string> {
  return fsp.readFile(filePath, "utf8");
}

async function defaultListDir(dirPath: string): Promise<string[]> {
  return fsp.readdir(dirPath);
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

function normalizeAgentResult(result: RinaAgentResult): InlineRinaResult {
  return {
    explanation: result.explanation,
    command: result.command ?? null,
    risk: result.risk,
    confirmation: !!result.command || !!result.pendingApproval,
    confirmationMessage: result.confirmation,
    pendingApproval: result.pendingApproval,
    agentEvents: result.events,
    usage: {
      model: "rina-agent",
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
  const raw = String(process.env.RINAWARP_INLINE_RINA_TEST_JSON || "").trim();
  if (!raw) return null;

  const parsed = parseJsonObject<EnvMockOutput>(raw);
  if (!parsed) {
    throw new Error("RINAWARP_INLINE_RINA_TEST_JSON did not contain valid JSON.");
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

async function callOpenAiJson(prompt: string, modelOverride?: string): Promise<InlineRinaResult> {
  const model = String(modelOverride || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const forcedError = String(process.env.RINAWARP_INLINE_RINA_TEST_ERROR || "").trim();
  if (forcedError) {
    throw new Error(forcedError);
  }

  const forcedOutputText = process.env.RINAWARP_INLINE_RINA_TEST_OUTPUT_TEXT;
  if (typeof forcedOutputText === "string" && forcedOutputText.length > 0) {
    const parsed = parseJsonObject<ModelOutput>(forcedOutputText);
    if (!parsed) {
      throw new Error("Model returned invalid JSON.");
    }

    return normalizeLlmResult(parsed, {
      model,
      promptTokens: null,
      responseTokens: null,
      totalTokens: null,
    });
  }

  const response = await getOpenAiClient().responses.create({
    model,
    temperature: 0.2,
    text: {
      format: {
        type: "json_schema",
        name: "inline_rina_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            explanation: { type: "string" },
            command: {
              anyOf: [{ type: "string" }, { type: "null" }],
            },
            risk: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
          },
          required: ["explanation", "command", "risk"],
        },
      },
    },
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
  });

  const rawText = response.output_text || "";
  const parsed = parseJsonObject<ModelOutput>(rawText);
  if (!parsed) {
    throw new Error("Model returned invalid JSON.");
  }

  return normalizeLlmResult(parsed, {
    model,
    promptTokens: response.usage?.input_tokens ?? null,
    responseTokens: response.usage?.output_tokens ?? null,
    totalTokens: response.usage?.total_tokens ?? null,
  });
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
    explanation: `Rina could not generate a reliable inline result for "${prompt}". Try a more specific request like "why did this fail?" or "what is using port 3000".`,
    command: null,
    risk: "low",
    confirmation: false,
    usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
  };
}

export async function runInlineRina(args: {
  request: InlineRinaRequest;
  session: PtySessionLike | undefined;
}): Promise<InlineRinaResult> {
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
  const projectRoot = args.request.projectRoot || args.session?.cwd || process.cwd();

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
    const usage = await getRinaUsageStatus(plan);
    const result = await runRinaAgent({
      sessionId: args.request.triggerType || "inline",
      userMessage: prompt,
      cwd: projectRoot,
      recentTranscript: stripAnsi(transcript).split(/\r?\n/g).filter(Boolean).slice(-20),
      recentCommands: recentCommandsFromTranscript(transcript),
      lastError: lastErrorFromTranscript(transcript),
      limits: usage.limits,
    }, {
      cwd: projectRoot,
      execText: defaultExecText,
    });
    return normalizeAgentResult(result);
  }

  if (!String(process.env.OPENAI_API_KEY || "").trim()) {
    return {
      explanation: "Rina is not configured yet. Set OPENAI_API_KEY in the main-process environment to enable model-backed inline help.",
      command: null,
      risk: "low",
      confirmation: false,
      usage: { model: null, promptTokens: null, responseTokens: null, totalTokens: null },
    };
  }

  try {
    const context = await buildRepoContext({
      request: args.request,
      projectRoot,
      transcript,
    });

    return await callOpenAiJson(buildPrompt(prompt, context));
  } catch (error) {
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
      explanation: `Rina could not generate a reliable inline result. ${message}`,
    };
  }
}
