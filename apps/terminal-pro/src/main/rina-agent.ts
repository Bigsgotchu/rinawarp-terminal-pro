import fs from "node:fs";
import fsp from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { decideNextStep, proposePatchForFailure, type AgentModelState } from "./rina-agent-model.js";
import { evaluateToolCall } from "./rina-policy.js";
import { executeTool, type RinaToolCall, type RinaToolDeps, type RinaToolResult } from "./rina-tools.js";
import { recordPatchBytes, recordToolCall } from "./rina-usage-meter.js";
import type { UsageLimit } from "./rina-usage-limits.js";

export type RinaAgentRequest = {
  sessionId: string;
  userMessage: string;
  cwd: string;
  recentTranscript: string[];
  recentCommands: string[];
  lastError?: string | null;
  limits?: UsageLimit;
};

export type RinaAgentStreamEvent =
  | { type: "assistant_message"; text: string }
  | { type: "tool_started"; tool: string; summary: string }
  | { type: "tool_result"; tool: string; summary: string; output?: string }
  | { type: "approval_requested"; action: string; details: string; payload: unknown }
  | { type: "task_complete"; summary: string };

export type RinaAgentResult = {
  explanation: string;
  command?: string;
  risk: "low" | "medium" | "high";
  confirmation?: string;
  pendingApproval?: {
    kind: "command" | "file_patch";
    payload: unknown;
  };
  events: RinaAgentStreamEvent[];
};

export type RinaAgentDeps = RinaToolDeps & {
  proposePatchForFailure?: typeof proposePatchForFailure;
};

type CommandApprovalPayload = {
  tool: "runCommand";
  command: string;
  cwd?: string;
  rerunCommand?: string;
  previousDiagnostic?: string;
};

const requireForNode = createRequire(import.meta.url);

type AgentState = AgentModelState & {
  rerunCommand: string;
  packageManager: AgentModelState["packageManager"];
  limits: UsageLimit;
  toolCallsUsed: number;
};

type PackageJsonData = {
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type DependencyState = {
  packageManager: AgentModelState["packageManager"];
  lockfilePresent: boolean;
  nodeModulesPresent: boolean;
  declaredPackages: Set<string>;
};

const KNOWN_LOCAL_BUILD_BINARIES = new Set([
  "webpack",
  "next",
  "vite",
  "tsc",
  "eslint",
  "jest",
  "vitest",
  "playwright",
  "rimraf",
]);

const LOCAL_BINARY_PACKAGE_CANDIDATES: Record<string, string[]> = {
  webpack: ["webpack", "webpack-cli"],
  next: ["next"],
  vite: ["vite"],
  tsc: ["typescript"],
  eslint: ["eslint"],
  jest: ["jest"],
  vitest: ["vitest"],
  playwright: ["playwright", "@playwright/test"],
  rimraf: ["rimraf"],
};

function detectPackageManager(cwd: string): AgentModelState["packageManager"] {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  return "unknown";
}

function isFailedBuildRecoveryPrompt(input: string): boolean {
  return /\b(?:my\s+)?build\s+(?:is\s+)?(?:failing|failed|broken|erroring)\b/i.test(input)
    || /\b(?:fix|diagnose|debug)\s+(?:the\s+)?(?:failed\s+)?build\b/i.test(input);
}

function summarizeToolResult(result: RinaToolResult): string {
  if (!result.ok) return result.error;
  if (result.tool === "listFiles") return `${Array.isArray(result.output) ? result.output.length : 0} files scanned`;
  if (result.tool === "readFile") {
    const pathValue = (result.output as { path?: string } | null)?.path;
    return pathValue ? `Read ${pathValue}` : "Read file";
  }
  if (result.tool === "getGitStatus") return String(result.output || "git status complete");
  if (result.tool === "runCommand") {
    const output = String((result.output as { output?: string } | null)?.output || "");
    return output.split(/\r?\n/g).slice(0, 4).join("\n");
  }
  if (result.tool === "searchInFiles") return `${Array.isArray(result.output) ? result.output.length : 0} matches found`;
  if (result.tool === "applyPatch") return `Updated ${String((result.output as { path?: string } | null)?.path || "file")}`;
  return "Tool completed";
}

function commandApprovalPayload(state: AgentState, command: string): CommandApprovalPayload {
  return {
    tool: "runCommand",
    command,
    cwd: state.cwd,
    rerunCommand: state.rerunCommand,
    previousDiagnostic: String(state.diagnosticOutput || "").trim() || undefined,
  };
}

export function buildAgentContext(request: RinaAgentRequest, deps: RinaAgentDeps = {}): AgentState {
  return {
    userMessage: request.userMessage,
    cwd: request.cwd,
    packageManager: detectPackageManager(request.cwd),
    workflow: isFailedBuildRecoveryPrompt(request.userMessage) ? "build_recovery" : undefined,
    cwdInspection: isFailedBuildRecoveryPrompt(request.userMessage) ? null : undefined,
    rerunCommand: "git status --short --branch",
    executedCommands: [],
    limits: request.limits || {
      maxAgentSteps: 9,
      maxToolCalls: 120,
      maxPatchBytes: 150_000,
      maxCommandMs: 180_000,
    },
    toolCallsUsed: 0,
  };
}

function toolLimitReached(state: AgentState): boolean {
  return state.toolCallsUsed >= (state.limits.maxToolCalls ?? 20);
}

async function consumeToolCall(state: AgentState): Promise<boolean> {
  if (toolLimitReached(state)) return false;
  state.toolCallsUsed += 1;
  await recordToolCall();
  return true;
}

function updateStateFromToolResult(state: AgentState, call: RinaToolCall, result: RinaToolResult): void {
  if (!result.ok) {
    if (call.tool === "runCommand" && call.command === "pwd" && state.workflow === "build_recovery") {
      state.cwdInspection = `[unavailable] ${result.error}`;
      state.executedCommands = Array.from(new Set([...(state.executedCommands || []), call.command]));
      return;
    }
    if (call.tool === "getGitStatus") {
      state.gitStatus = `[unavailable] ${result.error}`;
    }
    if (call.tool === "runCommand") {
      state.diagnosticOutput = result.error;
      if (state.workflow === "build_recovery") {
        state.rerunCommand = call.command;
      }
      state.executedCommands = Array.from(new Set([...(state.executedCommands || []), call.command]));
    }
    return;
  }

  switch (call.tool) {
    case "listFiles":
      state.listFiles = Array.isArray(result.output) ? result.output as string[] : [];
      break;
    case "readFile":
      if (call.path === "package.json") {
        state.packageJson = String((result.output as { content?: string } | null)?.content || "");
        state.rerunCommand = chooseRerunCommand(state.packageJson, state.packageManager);
      }
      break;
    case "getGitStatus":
      state.gitStatus = String(result.output || "");
      break;
    case "runCommand":
      if (call.command === "pwd" && state.workflow === "build_recovery") {
        state.cwdInspection = String((result.output as { output?: string } | null)?.output || "");
        state.executedCommands = Array.from(new Set([...(state.executedCommands || []), call.command]));
        break;
      }
      state.diagnosticOutput = String((result.output as { output?: string } | null)?.output || "");
      state.rerunCommand = call.command;
      state.executedCommands = Array.from(new Set([...(state.executedCommands || []), call.command]));
      break;
    case "searchInFiles":
      state.searchResults = Array.isArray(result.output) ? result.output as string[] : [];
      break;
    default:
      break;
  }
}

function chooseRerunCommand(packageJsonText: string | null | undefined, packageManager: AgentModelState["packageManager"]): string {
  if (!packageJsonText) return "git status --short --branch";
  try {
    const pkg = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
    if (pkg.scripts?.build) {
      if (packageManager === "pnpm") return "pnpm run build";
      if (packageManager === "yarn") return "yarn build";
      if (packageManager === "bun") return "bun run build";
      return "npm run build";
    }
    if (pkg.scripts?.test) {
      if (packageManager === "pnpm") return "pnpm test";
      if (packageManager === "yarn") return "yarn test";
      if (packageManager === "bun") return "bun test";
      return "npm test";
    }
  } catch {
    // Ignore parse issues and keep the fallback.
  }
  return "git status --short --branch";
}

function parsePackageJson(text: string | null | undefined): PackageJsonData | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as PackageJsonData;
  } catch {
    return null;
  }
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function hasWorkspaceProtocolInstallFailure(text: string): boolean {
  return /EUNSUPPORTEDPROTOCOL/i.test(text) && /workspace:/i.test(text)
    || /Unsupported URL Type ["'`]workspace:/i.test(text);
}

function isInstallCommand(command: string): boolean {
  return /^(?:npm|pnpm|yarn|bun)\s+install(?:\s|$)/i.test(String(command || "").trim());
}

function findSiblingPackagePath(cwd: string, packageName: string): string | null {
  const parentDir = path.dirname(cwd);
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidateDir = path.join(parentDir, entry.name);
    const candidatePackageJson = path.join(candidateDir, "package.json");
    if (!fs.existsSync(candidatePackageJson)) continue;
    try {
      const candidatePkg = JSON.parse(fs.readFileSync(candidatePackageJson, "utf8")) as { name?: string };
      if (candidatePkg.name === packageName) {
        const relativeDir = path.relative(cwd, candidateDir).replace(/\\/g, "/");
        return relativeDir.startsWith(".") ? relativeDir : `./${relativeDir}`;
      }
    } catch {
      // Ignore malformed sibling package.json files.
    }
  }

  return null;
}

function patchWorkspaceProtocolDependenciesForStandaloneRepo(cwd: string, pkg: PackageJsonData & { name?: string }): string | null {
  let changed = false;
  const sections: Array<keyof PackageJsonData> = ["dependencies", "devDependencies"];
  const nextPkg: PackageJsonData & { name?: string } = {
    ...pkg,
    dependencies: pkg.dependencies ? { ...pkg.dependencies } : undefined,
    devDependencies: pkg.devDependencies ? { ...pkg.devDependencies } : undefined,
  };

  for (const section of sections) {
    const deps = nextPkg[section];
    if (!deps) continue;
    for (const [packageName, version] of Object.entries(deps)) {
      if (!String(version || "").startsWith("workspace:")) continue;
      const siblingPath = findSiblingPackagePath(cwd, packageName);
      if (!siblingPath) continue;
      deps[packageName] = `file:${siblingPath}`;
      changed = true;
    }
  }

  return changed ? stringifyJson(nextPkg) : null;
}

function extractScriptNameFromRunCommand(command: string): string | null {
  const text = String(command || "").trim();
  const npm = text.match(/^(?:npm|pnpm)\s+run\s+([a-z0-9:_-]+)/i);
  if (npm?.[1]) return npm[1];
  const yarn = text.match(/^yarn\s+([a-z0-9:_-]+)/i);
  if (yarn?.[1] && yarn[1] !== "run") return yarn[1];
  const bun = text.match(/^bun\s+run\s+([a-z0-9:_-]+)/i);
  if (bun?.[1]) return bun[1];
  return null;
}

function firstScriptStep(script: string): string | null {
  return String(script || "")
    .split(/\s*&&\s*/g)
    .map((part) => part.trim())
    .filter(Boolean)[0] || null;
}

function weakFailureOnly(output: string): boolean {
  const text = String(output || "").trim();
  return /^Command failed: .*npm run [a-z0-9:_-]+\s*$/i.test(text)
    || /^Command failed: .*yarn [a-z0-9:_-]+\s*$/i.test(text)
    || /^Command failed: .*bun run [a-z0-9:_-]+\s*$/i.test(text)
    || /^Command failed: .*tsc(?:\s|$)/i.test(text);
}

function alwaysRepairCandidatePaths(listFiles: string[] | undefined): string[] {
  if (!Array.isArray(listFiles)) return [];
  const matches = new Set<string>();
  for (const entry of listFiles) {
    const normalized = String(entry || "").replace(/\/$/, "");
    const base = path.basename(normalized);
    if (
      normalized === "package.json" ||
      /^tsconfig(?:\..+)?\.json$/i.test(base) ||
      normalized === "vite.config.ts" ||
      normalized === "vite.config.js" ||
      /^webpack\.config\./i.test(base) ||
      /^jest\.config\./i.test(base) ||
      /^vitest\.config\./i.test(base) ||
      /^playwright\.config\./i.test(base)
    ) {
      matches.add(normalized);
    }
  }
  return [...matches];
}

function buildNodeCleanupCommand(script: string): string | null {
  const match = String(script || "").match(/\brimraf\s+([^&|;]+)/i);
  if (!match?.[1]) return null;
  const targets = match[1].trim().split(/\s+/g).filter(Boolean);
  if (!targets.length) return null;
  const encodedTargets = `[${targets.map((target) => `'${target.replace(/'/g, "\\'")}'`).join(",")}]`;
  return `node -e "const fs=require('fs');for(const target of ${encodedTargets}){if(target.includes('*')){const suffix=target.replace('*','');for(const entry of fs.readdirSync('.').filter((name)=>name.endsWith(suffix))){fs.rmSync(entry,{force:true,recursive:true});}}else{fs.rmSync(target,{force:true,recursive:true});}}"`;
}

function replaceRimrafInScript(script: string): string | null {
  const nodeCleanup = buildNodeCleanupCommand(script);
  if (!nodeCleanup) return null;
  return String(script).replace(/\brimraf\s+([^&|;]+)/i, nodeCleanup);
}

function placeholderFileContent(filePath: string): string {
  const base = path.basename(filePath);
  if (/\.(c|m)?js$/i.test(base)) {
    return [
      "// Placeholder generated by Rina to satisfy the package script target.",
      "// Replace this with the intended test logic once the real coverage is known.",
      "console.log(\"Placeholder script completed successfully.\");",
      "",
    ].join("\n");
  }
  if (/\.ts$/i.test(base)) {
    return [
      "// Placeholder generated by Rina to satisfy the package script target.",
      "export {};",
      "",
    ].join("\n");
  }
  return "";
}

type TsConfigJson = {
  compilerOptions?: Record<string, unknown>;
  references?: Array<{ path?: string }>;
  include?: unknown;
};

function parseJsonObject<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function collectDeclaredPackages(pkg: PackageJsonData | null): Set<string> {
  return new Set([
    ...Object.keys(pkg?.dependencies || {}),
    ...Object.keys(pkg?.devDependencies || {}),
  ]);
}

function dependencyStateFrom(state: AgentState, pkg: PackageJsonData | null): DependencyState {
  const listFiles = state.listFiles || [];
  return {
    packageManager: state.packageManager,
    lockfilePresent: listFiles.includes("pnpm-lock.yaml") || listFiles.includes("package-lock.json") || listFiles.includes("yarn.lock") || listFiles.includes("bun.lock") || listFiles.includes("bun.lockb"),
    nodeModulesPresent: listFiles.some((entry) => entry === "node_modules/" || entry.startsWith("node_modules/")),
    declaredPackages: collectDeclaredPackages(pkg),
  };
}

function installCommandFor(packageManager: AgentModelState["packageManager"]): string {
  if (packageManager === "pnpm") return "pnpm install";
  if (packageManager === "yarn") return "yarn install";
  if (packageManager === "bun") return "bun install";
  return "npm install";
}

function addDependencyCommandFor(packageManager: AgentModelState["packageManager"], dependency: string): string {
  if (packageManager === "pnpm") return `pnpm add ${dependency}`;
  if (packageManager === "yarn") return `yarn add ${dependency}`;
  if (packageManager === "bun") return `bun add ${dependency}`;
  return `npm install ${dependency}`;
}

function addDevDependencyCommandFor(packageManager: AgentModelState["packageManager"], dependency: string): string {
  if (packageManager === "pnpm") return `pnpm add -D ${dependency}`;
  if (packageManager === "yarn") return `yarn add -D ${dependency}`;
  if (packageManager === "bun") return `bun add -d ${dependency}`;
  return `npm install -D ${dependency}`;
}

function isRelativeOrAbsoluteModuleName(value: string): boolean {
  return value.startsWith(".") || value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function isAliasModuleName(value: string): boolean {
  return /^@\/.+/.test(value) || /^~\/.+/.test(value);
}

function normalizePackageName(specifier: string): string {
  const value = String(specifier || "").trim();
  if (!value) return value;
  if (value.startsWith("@")) {
    const parts = value.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
  }
  return value.split("/")[0] || value;
}

function extractMissingModules(diagnostic: string): string[] {
  const matches = new Set<string>();
  const regex = /(?:TS2307:\s+Cannot find module|Cannot find module|This JSX tag requires the module path)\s+['"`]([^'"`]+)['"`]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(diagnostic))) {
    const value = String(match[1] || "").trim();
    if (value) matches.add(value);
  }
  return [...matches];
}

function extractMissingTypeDefinitionFiles(diagnostic: string): string[] {
  const matches = new Set<string>();
  const regex = /Cannot find type definition file for ['"`]([^'"`]+)['"`]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(diagnostic))) {
    const value = String(match[1] || "").trim();
    if (value) matches.add(value);
  }
  return [...matches];
}

function extractMissingLocalBuildBinary(diagnostic: string): string | null {
  const patterns = [
    /sh:\s+\d+:\s+([a-z0-9@/_-]+):\s+not found/i,
    /\b([a-z0-9@/_-]+):\s+not found\b/i,
    /command not found:\s+([a-z0-9@/_-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = diagnostic.match(pattern);
    const tool = String(match?.[1] || "").trim().toLowerCase();
    if (tool && KNOWN_LOCAL_BUILD_BINARIES.has(tool)) return tool;
  }
  return null;
}

function packageCandidatesForBinary(tool: string): string[] {
  return LOCAL_BINARY_PACKAGE_CANDIDATES[tool] || [tool];
}

function declaredPackageForBinary(tool: string, declaredPackages: Set<string>): string | null {
  for (const candidate of packageCandidatesForBinary(tool)) {
    if (declaredPackages.has(candidate)) return candidate;
  }
  return null;
}

function typeDefinitionPackageFor(typeName: string): string {
  if (typeName === "node") return "@types/node";
  if (typeName === "vscode") return "@types/vscode";
  return `@types/${typeName}`;
}

function isDependencyCascadeDiagnostic(diagnostic: string, missingModules: string[]): boolean {
  if (!missingModules.length) return false;
  const dependencyLike = missingModules.filter((value) => !isRelativeOrAbsoluteModuleName(value) && !isAliasModuleName(value));
  const jsxRuntime = dependencyLike.some((value) => /jsx-runtime$/i.test(value));
  const missingNodeTypes = /Cannot find type definition file for ['"`]node['"`]|TS2688:/i.test(diagnostic);
  return dependencyLike.length >= 2 || jsxRuntime || (dependencyLike.length >= 1 && missingNodeTypes);
}

function isNodeOnlyTypeDiagnostic(diagnostic: string): boolean {
  return /Cannot find type definition file for ['"`]node['"`]|TS2688:|Cannot find name ['"`](process|__dirname|Buffer|global)['"`]/i.test(diagnostic);
}

function firstUndeclaredDependency(missingModules: string[], declaredPackages: Set<string>): string | null {
  for (const specifier of missingModules) {
    if (isRelativeOrAbsoluteModuleName(specifier) || isAliasModuleName(specifier)) continue;
    const dependency = normalizePackageName(specifier);
    if (!isDeclaredModuleSpecifier(specifier, declaredPackages)) return dependency;
  }
  return null;
}

function hasAliasPathFailure(missingModules: string[]): boolean {
  return missingModules.some((value) => isAliasModuleName(value));
}

function isDeclaredModuleSpecifier(specifier: string, declaredPackages: Set<string>): boolean {
  const dependency = normalizePackageName(specifier);
  if (declaredPackages.has(dependency)) return true;
  if (specifier === "vscode" && declaredPackages.has("@types/vscode")) return true;
  if (specifier === "node" && declaredPackages.has("@types/node")) return true;
  return false;
}

function rootTsConfigPath(candidateFiles: Array<{ path: string; content: string }>): string | null {
  return candidateFiles.find((file) => file.path === "tsconfig.json")?.path || null;
}

function extractFirstSourceErrorPath(diagnostic: string, cwd: string): string | null {
  const match = diagnostic.match(/(^|\n)([^()\n]+\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs))\(\d+,\d+\):\s+error\s+TS\d+/i);
  if (!match?.[2]) return null;
  const value = match[2].trim();
  return value.startsWith(cwd) ? path.relative(cwd, value) : value;
}

async function readInstalledPackageTypes(cwd: string, packageName: string): Promise<string | null> {
  try {
    const packageJsonPath = requireForNode.resolve(`${packageName}/package.json`, { paths: [cwd] });
    const packageJsonText = await fsp.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonText) as { types?: string; typings?: string };
    const typeEntry = packageJson.types || packageJson.typings;
    if (!typeEntry) return null;
    const typesPath = path.resolve(path.dirname(packageJsonPath), typeEntry);
    return await fsp.readFile(typesPath, "utf8");
  } catch {
    return null;
  }
}

async function readInstalledTypesFromDiagnosticPath(diagnostic: string): Promise<string | null> {
  const match = diagnostic.match(/typeof import\(["'`]([^"'`]+react-resizable-panels[^"'`]*)["'`]\)/i);
  if (!match?.[1]) return null;
  const basePath = match[1];
  for (const candidate of [`${basePath}.d.ts`, basePath]) {
    try {
      return await fsp.readFile(candidate, "utf8");
    } catch {
      // Try the next candidate path.
    }
  }
  return null;
}

async function maybeRepairReactResizablePanelsApiDrift(args: {
  state: AgentState;
  candidateFiles: Array<{ path: string; content: string }>;
  diagnostic: string;
}): Promise<{ path: string; newContent: string; summary: string; rerunCommand?: string | null } | null> {
  if (!/react-resizable-panels/i.test(args.diagnostic)) return null;
  if (!/TS2339|TS2305|TS2724|TS2322/i.test(args.diagnostic)) return null;

  const sourcePath = extractFirstSourceErrorPath(args.diagnostic, args.state.cwd);
  if (!sourcePath) return null;
  const sourceFile = args.candidateFiles.find((file) => file.path === sourcePath);
  if (!sourceFile) return null;

  const installedTypes = await readInstalledPackageTypes(args.state.cwd, "react-resizable-panels")
    || await readInstalledTypesFromDiagnosticPath(args.diagnostic);
  if (!installedTypes) return null;

  const exportsGroup = /\bexport declare function Group\b/.test(installedTypes);
  const exportsSeparator = /\bexport declare function Separator\b/.test(installedTypes);
  if (!exportsGroup || !exportsSeparator) return null;

  let nextContent = sourceFile.content;
  if (/\bResizablePrimitive\.PanelGroup\b/.test(nextContent)) {
    nextContent = nextContent.replace(/\bResizablePrimitive\.PanelGroup\b/g, "ResizablePrimitive.Group");
  }
  if (/\bResizablePrimitive\.PanelResizeHandle\b/.test(nextContent)) {
    nextContent = nextContent.replace(/\bResizablePrimitive\.PanelResizeHandle\b/g, "ResizablePrimitive.Separator");
  }
  if (nextContent === sourceFile.content) return null;

  return {
    path: sourcePath,
    newContent: nextContent,
    summary: "Update the source file to use the installed `react-resizable-panels` API names (`Group` and `Separator`) instead of the older members that no longer exist.",
    rerunCommand: args.state.rerunCommand,
  };
}

function normalizeTypescriptConfigPath(configPath: string | undefined): string | null {
  if (!configPath) return null;
  const trimmed = String(configPath).trim().replace(/^\.\//, "");
  return trimmed || null;
}

function chooseReferencedTsconfigPath(args: {
  candidateFiles: Array<{ path: string; content: string }>;
  needDom: boolean;
  needNode: boolean;
  needVscode: boolean;
}): string | null {
  const rootConfig = args.candidateFiles.find((file) => file.path === "tsconfig.json");
  const rootJson = rootConfig ? parseJsonObject<TsConfigJson>(rootConfig.content) : null;
  const references = (rootJson?.references || [])
    .map((entry) => normalizeTypescriptConfigPath(entry.path))
    .filter((value): value is string => !!value);
  const referencedFiles = references
    .map((refPath) => args.candidateFiles.find((file) => file.path === refPath))
    .filter((file): file is { path: string; content: string } => !!file);
  if (!referencedFiles.length) return null;

  const scored = referencedFiles.map((file) => {
    const json = parseJsonObject<TsConfigJson>(file.content);
    const compilerOptions = json?.compilerOptions || {};
    let score = 0;
    if (args.needNode) {
      if (/node/i.test(file.path)) score += 4;
      if (Array.isArray(compilerOptions.types) && (compilerOptions.types as string[]).some((value) => /node/i.test(value))) score += 3;
      if (JSON.stringify(json?.include || []).includes("vite.config")) score += 2;
    }
    if (args.needDom || args.needVscode) {
      if (/app/i.test(file.path)) score += 4;
      if (JSON.stringify(json?.include || []).includes("src")) score += 3;
      if (typeof compilerOptions.jsx === "string") score += 2;
      if (Array.isArray(compilerOptions.lib) && (compilerOptions.lib as string[]).some((value) => /dom/i.test(value))) score += 1;
    }
    return { path: file.path, score };
  });
  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scored[0]?.path || referencedFiles[0]?.path || null;
}

function updateTsconfigFile(args: {
  candidateFiles: Array<{ path: string; content: string }>;
  targetPath: string;
  mutator: (tsconfig: TsConfigJson) => boolean;
}): string | null {
  const target = args.candidateFiles.find((file) => file.path === args.targetPath);
  if (!target) return null;
  const json = parseJsonObject<TsConfigJson>(target.content);
  if (!json) return null;
  const nextJson: TsConfigJson = {
    ...json,
    compilerOptions: { ...(json.compilerOptions || {}) },
  };
  const changed = args.mutator(nextJson);
  if (!changed) return null;
  return stringifyJson(nextJson);
}

function inspectAliasConfig(args: {
  candidateFiles: Array<{ path: string; content: string }>;
}): { targetPath: string; nextContent: string } | null {
  const tsconfigPath = rootTsConfigPath(args.candidateFiles);
  if (!tsconfigPath) return null;
  const nextContent = updateTsconfigFile({
    candidateFiles: args.candidateFiles,
    targetPath: tsconfigPath,
    mutator: (tsconfig) => {
      const compilerOptions = tsconfig.compilerOptions || (tsconfig.compilerOptions = {});
      const currentBaseUrl = String(compilerOptions.baseUrl || "");
      const rawPaths = compilerOptions.paths;
      const paths = rawPaths && typeof rawPaths === "object" && !Array.isArray(rawPaths)
        ? { ...(rawPaths as Record<string, unknown>) }
        : {};
      let changed = false;
      if (!currentBaseUrl) {
        compilerOptions.baseUrl = ".";
        changed = true;
      }
      const aliasEntry = paths["@/*"];
      const aliasValues = Array.isArray(aliasEntry) ? aliasEntry.map((value) => String(value)) : [];
      if (!aliasValues.includes("./src/*")) {
        paths["@/*"] = ["./src/*"];
        compilerOptions.paths = paths;
        changed = true;
      }
      return changed;
    },
  });
  if (!nextContent) return null;
  return { targetPath: tsconfigPath, nextContent };
}

async function maybeProposeCommandRepair(state: AgentState, deps: RinaAgentDeps, events: RinaAgentStreamEvent[]): Promise<RinaAgentResult | null> {
  const diagnostic = String(state.diagnosticOutput || "").trim();
  if (!diagnostic) return null;
  const pkg = parsePackageJson(state.packageJson);
  const dependencyState = dependencyStateFrom(state, pkg);
  const dependenciesDeclared = dependencyState.declaredPackages.size > 0;
  const missingModules = extractMissingModules(diagnostic);
  const missingTypeDefinitions = extractMissingTypeDefinitionFiles(diagnostic);
  const dependencyCascade = isDependencyCascadeDiagnostic(diagnostic, missingModules);
  const missingLocalBinary = extractMissingLocalBuildBinary(diagnostic);

  if (missingLocalBinary) {
    const declaredBinaryPackage = declaredPackageForBinary(missingLocalBinary, dependencyState.declaredPackages);
    const fallbackBinaryPackage = packageCandidatesForBinary(missingLocalBinary)[0] || missingLocalBinary;

    if (dependenciesDeclared && !dependencyState.nodeModulesPresent) {
      const command = installCommandFor(dependencyState.packageManager);
      const payload = commandApprovalPayload(state, command);
      const details = dependencyState.lockfilePresent
        ? `The build is missing the local \`${missingLocalBinary}\` binary, package metadata is already declared, and no \`node_modules\` directory is present. Run \`${command}\` to restore the repo's install state before changing source files.`
        : `The build is missing the local \`${missingLocalBinary}\` binary, dependencies are declared in \`package.json\`, and no \`node_modules\` directory is present. Run \`${command}\` to install the repo's packages before attempting source repairs.`;
      events.push({
        type: "approval_requested",
        action: "Run install command",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this install command to restore the local project binaries.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }

    if (!declaredBinaryPackage) {
      const command = addDevDependencyCommandFor(dependencyState.packageManager, fallbackBinaryPackage);
      const payload = commandApprovalPayload(state, command);
      const details = `The build expects the local \`${missingLocalBinary}\` binary, but the repo does not declare the package that usually provides it. Add \`${fallbackBinaryPackage}\` as a devDependency before rerunning build.`;
      events.push({
        type: "approval_requested",
        action: "Add missing devDependency",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this dependency install to add the missing local build tool.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }

    if (dependencyState.nodeModulesPresent) {
      const command = installCommandFor(dependencyState.packageManager);
      const payload = commandApprovalPayload(state, command);
      const details = `The repo declares \`${declaredBinaryPackage}\`, but the \`${missingLocalBinary}\` binary is still missing from the current install state. Run \`${command}\` to repair the local dependency installation before changing source files.`;
      events.push({
        type: "approval_requested",
        action: "Repair install state",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this install command to repair the local dependency state.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }
  }

  if (missingTypeDefinitions.length > 0) {
    const firstMissingType = missingTypeDefinitions[0];
    const typesPackage = typeDefinitionPackageFor(firstMissingType);
    const declaredTypePackage = dependencyState.declaredPackages.has(typesPackage);

    if (declaredTypePackage && !dependencyState.nodeModulesPresent) {
      const command = installCommandFor(dependencyState.packageManager);
      const payload = commandApprovalPayload(state, command);
      const details = dependencyState.lockfilePresent
        ? `The TypeScript build cannot resolve the declared \`${firstMissingType}\` type library, and this repo has no \`node_modules\` directory. Run \`${command}\` to restore the install state before changing config or source files.`
        : `The TypeScript build cannot resolve the declared \`${firstMissingType}\` type library, and this repo has no \`node_modules\` directory. Run \`${command}\` to install the repo's packages before changing config or source files.`;
      events.push({
        type: "approval_requested",
        action: "Run install command",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this install command to restore the declared type packages.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }

    if (!declaredTypePackage) {
      const command = addDevDependencyCommandFor(dependencyState.packageManager, typesPackage);
      const payload = commandApprovalPayload(state, command);
      const details = `The TypeScript build needs the \`${firstMissingType}\` type library, but \`${typesPackage}\` is not declared in \`package.json\`. Add it as a devDependency before rerunning the compiler.`;
      events.push({
        type: "approval_requested",
        action: "Add missing devDependency",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this dependency install to add the missing type package.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }

    if (declaredTypePackage && dependencyState.nodeModulesPresent) {
      const command = installCommandFor(dependencyState.packageManager);
      const payload = commandApprovalPayload(state, command);
      const details = `The repo already declares \`${typesPackage}\`, but TypeScript still cannot resolve the \`${firstMissingType}\` type library. Run \`${command}\` to repair the local dependency installation before changing config or source files.`;
      events.push({
        type: "approval_requested",
        action: "Repair install state",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this install command to repair the local type-package install state.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }
  }

  if (dependencyCascade && dependencyState.declaredPackages.size > 0) {
    const dependencyLike = missingModules
      .filter((value) => !isRelativeOrAbsoluteModuleName(value) && !isAliasModuleName(value))
      .filter((value) => isDeclaredModuleSpecifier(value, dependencyState.declaredPackages));
    const declaredMissing = dependencyLike.map((value) => normalizePackageName(value));
    if (declaredMissing.length > 0 && !dependencyState.nodeModulesPresent) {
      const command = installCommandFor(dependencyState.packageManager);
      const payload = commandApprovalPayload(state, command);
      const details = `Dependencies appear declared in package.json, but the install state is missing here. Run \`${command}\` before attempting a tsconfig repair.`;
      events.push({
        type: "approval_requested",
        action: "Run install command",
        details,
        payload,
      });
      return {
        explanation: details,
        risk: "medium",
        confirmation: "Approve this install command to restore the repo's dependency state.",
        pendingApproval: {
          kind: "command",
          payload,
        },
        events,
      };
    }
  }

  const undeclaredDependency = firstUndeclaredDependency(missingModules, dependencyState.declaredPackages);
  if (undeclaredDependency) {
    const command = addDependencyCommandFor(dependencyState.packageManager, undeclaredDependency);
    const payload = commandApprovalPayload(state, command);
    const details = `The build is missing an undeclared dependency, \`${undeclaredDependency}\`. Add it to package metadata before rerunning the build.`;
    events.push({
      type: "approval_requested",
      action: "Add missing dependency",
      details,
      payload,
    });
    return {
      explanation: details,
      risk: "medium",
      confirmation: "Approve this dependency install to update package metadata and restore the missing module.",
      pendingApproval: {
        kind: "command",
        payload,
      },
      events,
    };
  }

  return null;
}

async function deterministicRepairProposal(args: {
  state: AgentState;
  candidateFiles: Array<{ path: string; content: string }>;
}): Promise<{ path: string; newContent: string; summary: string; rerunCommand?: string | null } | null> {
  const diagnostic = String(args.state.diagnosticOutput || "");
  const packageFile = args.candidateFiles.find((file) => file.path === "package.json");
  const pkg = parsePackageJson(packageFile?.content);
  const dependencyState = dependencyStateFrom(args.state, pkg);
  const missingModules = extractMissingModules(diagnostic);

  if (weakFailureOnly(diagnostic) && packageFile && pkg?.scripts) {
    const failingScriptName = extractScriptNameFromRunCommand(args.state.rerunCommand);
    if (failingScriptName && pkg.scripts[failingScriptName]) {
      const directStep = firstScriptStep(pkg.scripts[failingScriptName]);
      const nestedScriptName = directStep ? extractScriptNameFromRunCommand(directStep) : null;
      const nestedScriptText = nestedScriptName ? pkg.scripts[nestedScriptName] : null;
      if (nestedScriptName && nestedScriptText && /\brimraf\b/i.test(nestedScriptText)) {
        const nextValue = replaceRimrafInScript(nestedScriptText);
        if (nextValue && nextValue !== nestedScriptText) {
          const updatedPkg: PackageJsonData = {
            ...pkg,
            scripts: {
              ...pkg.scripts,
              [nestedScriptName]: nextValue,
            },
          };
          return {
            path: "package.json",
            newContent: stringifyJson(updatedPkg),
            summary: "Replace the nested `rimraf` cleanup step with a Node-based cleanup command so the build can make progress without that missing binary.",
            rerunCommand: args.state.rerunCommand,
          };
        }
      }
    }
  }

  if (/sh:\s+\d+:\s+rimraf:\s+not found/i.test(diagnostic) && packageFile && pkg?.scripts) {
    const scriptEntry = Object.entries(pkg.scripts).find(([, value]) => /\brimraf\b/i.test(String(value)));
    if (scriptEntry) {
      const [scriptName, scriptValue] = scriptEntry;
      const nextValue = replaceRimrafInScript(scriptValue);
      if (nextValue && nextValue !== scriptValue) {
        const updatedPkg: PackageJsonData = {
          ...pkg,
          scripts: {
            ...pkg.scripts,
            [scriptName]: nextValue,
          },
        };
        return {
          path: "package.json",
          newContent: stringifyJson(updatedPkg),
          summary: "Replace the missing `rimraf` script step with a Node-based cleanup command so the build can run without that external binary.",
          rerunCommand: args.state.rerunCommand,
        };
      }
    }
  }

  const missingModule = diagnostic.match(/Cannot find module ['"`]([^'"`]+)['"`]/i);
  if (missingModule?.[1] && packageFile && pkg?.scripts) {
    const rawTarget = missingModule[1].trim();
    const relativePath = rawTarget.startsWith(args.state.cwd)
      ? path.relative(args.state.cwd, rawTarget)
      : rawTarget.includes("/") || rawTarget.includes("\\")
        ? rawTarget
        : rawTarget;
    const base = path.basename(relativePath);
    const owningScript = Object.entries(pkg.scripts).find(([, value]) => new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(String(value)));
    if (owningScript && !args.candidateFiles.some((file) => file.path === relativePath)) {
      const content = placeholderFileContent(relativePath);
      if (content) {
        return {
          path: relativePath,
          newContent: content,
          summary: `Create the missing script target \`${relativePath}\` so the package script can run again and reveal the next real failure, if any.`,
          rerunCommand: args.state.rerunCommand,
        };
      }
    }
  }

  if ((/Cannot find type definition file ['"`]node['"`]/i.test(diagnostic) || /TS2688:/i.test(diagnostic)) && packageFile && pkg) {
    const hasNodeTypes = !!pkg.devDependencies?.["@types/node"] || !!pkg.dependencies?.["@types/node"];
    if (!hasNodeTypes) {
      const updatedPkg: PackageJsonData = {
        ...pkg,
        devDependencies: {
          ...(pkg.devDependencies || {}),
          "@types/node": "^22.0.0",
        },
      };
      return {
        path: "package.json",
        newContent: stringifyJson(updatedPkg),
        summary: "Add `@types/node` to devDependencies so the TypeScript build can resolve the `node` type library declared in tsconfig.",
        rerunCommand: args.state.rerunCommand,
      };
    }
  }

  if (hasAliasPathFailure(missingModules)) {
    const aliasConfig = inspectAliasConfig({ candidateFiles: args.candidateFiles });
    if (aliasConfig) {
      return {
        path: aliasConfig.targetPath,
        newContent: aliasConfig.nextContent,
        summary: "Add the missing path alias configuration to tsconfig so `@/` imports resolve consistently before rerunning the build.",
        rerunCommand: args.state.rerunCommand,
      };
    }
  }

  const apiDriftRepair = await maybeRepairReactResizablePanelsApiDrift({
    state: args.state,
    candidateFiles: args.candidateFiles,
    diagnostic,
  });
  if (apiDriftRepair) {
    return apiDriftRepair;
  }

  if (/TS2345:.*Position.*not assignable to parameter of type 'Range'/i.test(diagnostic)) {
    const targetFile = args.candidateFiles.find((file) =>
      /new\s+vscode\.InlineCompletionItem\s*\(\s*[^,]+,\s*position\s*\)/.test(file.content)
      && /provideInlineCompletionItems/.test(file.content)
    );
    if (targetFile) {
      const nextContent = targetFile.content.replace(
        /new\s+vscode\.InlineCompletionItem\s*\(\s*([^,]+),\s*position\s*\)/g,
        "new vscode.InlineCompletionItem($1, new vscode.Range(position, position))",
      );
      if (nextContent !== targetFile.content) {
        return {
          path: targetFile.path,
          newContent: nextContent,
          summary: "Update the VS Code inline completion item to pass a zero-width `Range` instead of a raw `Position`, which matches the current API typing.",
          rerunCommand: args.state.rerunCommand,
        };
      }
    }
  }

  const weakTscRepair = weakFailureOnly(diagnostic) && (args.state.executedCommands || []).some((command) => /^tsc(?:\s|$)/i.test(command));
  const hasNodeTypesPackage = !!pkg?.devDependencies?.["@types/node"] || !!pkg?.dependencies?.["@types/node"];
  const hasVscodeSignal = !!pkg?.engines?.vscode || !!pkg?.devDependencies?.["@types/vscode"] || !!pkg?.dependencies?.["@types/vscode"];
  const hasFetchSignal = !!pkg?.dependencies?.["node-fetch"] || !!pkg?.dependencies?.undici;
  const needsDom = weakTscRepair ? hasFetchSignal : /Cannot find name ['"`](fetch|console)['"`]/i.test(diagnostic);
  const needsVscode = weakTscRepair ? hasVscodeSignal : /TS2307:\s+Cannot find module ['"`]vscode['"`]/i.test(diagnostic) || /Cannot find module ['"`]vscode['"`]/i.test(diagnostic);
  const needsNode = (hasNodeTypesPackage && (isNodeOnlyTypeDiagnostic(diagnostic) || weakTscRepair || needsDom || needsVscode))
    || /Cannot find type definition file ['"`]node['"`]/i.test(diagnostic);
  const dependencyCascade = isDependencyCascadeDiagnostic(diagnostic, missingModules);
  const explicitTsConfigRepair = (weakTscRepair && !dependencyCascade) || needsDom || needsVscode || /TS2307:/i.test(diagnostic) || isNodeOnlyTypeDiagnostic(diagnostic);
  if (explicitTsConfigRepair) {
    const targetPath = chooseReferencedTsconfigPath({
      candidateFiles: args.candidateFiles,
      needDom: needsDom,
      needNode: needsNode,
      needVscode: needsVscode,
    }) || (args.candidateFiles.find((file) => file.path === "tsconfig.json")?.path || null);
    if (targetPath) {
      const nextContent = updateTsconfigFile({
        candidateFiles: args.candidateFiles,
        targetPath,
        mutator: (tsconfig) => {
          const compilerOptions = tsconfig.compilerOptions || (tsconfig.compilerOptions = {});
          const hadLibArray = Array.isArray(compilerOptions.lib);
          const hadTypesArray = Array.isArray(compilerOptions.types);
          const libs = new Set(hadLibArray ? compilerOptions.lib as string[] : []);
          const types = new Set(hadTypesArray ? compilerOptions.types as string[] : []);
          let changed = false;

          if (needsDom && !libs.has("DOM")) {
            libs.add("DOM");
            compilerOptions.lib = [...libs];
            changed = true;
          } else if (hadLibArray) {
            compilerOptions.lib = [...libs];
          }
          if (needsVscode && !types.has("vscode")) {
            types.add("vscode");
            changed = true;
          }
          if (needsNode && !types.has("node")) {
            types.add("node");
            changed = true;
          }
          if (types.size > 0 || hadTypesArray) {
            compilerOptions.types = [...types];
          }
          return changed;
        },
      });
      if (nextContent) {
        return {
          path: targetPath,
          newContent: nextContent,
          summary: "Update the relevant TypeScript config to include the repo's declared runtime and type libraries so the compiler can resolve its environment before rerunning.",
          rerunCommand: args.state.rerunCommand,
        };
      }
    }
  }

  const moduleResolutionHint = diagnostic.match(/moduleResolution['"`]?\s+option\s+to\s+['"`](nodenext|node16|bundler)['"`]/i)
    || diagnostic.match(/Option ['"`]moduleResolution['"`] must be set to ['"`](nodenext|node16|bundler)['"`]/i);
  if (moduleResolutionHint) {
    const targetPath = chooseReferencedTsconfigPath({
      candidateFiles: args.candidateFiles,
      needDom: false,
      needNode: hasNodeTypesPackage,
      needVscode: false,
    }) || (args.candidateFiles.find((file) => file.path === "tsconfig.json")?.path || null);
    if (targetPath) {
      const requestedModuleResolution = moduleResolutionHint[1];
      const nextContent = updateTsconfigFile({
        candidateFiles: args.candidateFiles,
        targetPath,
        mutator: (tsconfig) => {
          const compilerOptions = tsconfig.compilerOptions || (tsconfig.compilerOptions = {});
          let changed = false;
          if (String(compilerOptions.moduleResolution || "").toLowerCase() !== requestedModuleResolution.toLowerCase()) {
            compilerOptions.moduleResolution = requestedModuleResolution;
            changed = true;
          }
          if (/nodenext|node16/i.test(requestedModuleResolution)) {
            const requiredModule = requestedModuleResolution.toLowerCase() === "nodenext" ? "NodeNext" : "Node16";
            if (String(compilerOptions.module || "") !== requiredModule) {
              compilerOptions.module = requiredModule;
              changed = true;
            }
          }
          return changed;
        },
      });
      if (nextContent) {
        return {
          path: targetPath,
          newContent: nextContent,
          summary: `Align the TypeScript module settings in \`${targetPath}\` with the compiler's requested \`${requestedModuleResolution}\` resolution mode.`,
          rerunCommand: args.state.rerunCommand,
        };
      }
    }
  }

  const compositeConfigPath = diagnostic.match(/Referenced project ['"`]([^'"`]+tsconfig[^'"`]*)['"`] must have setting ['"`]composite['"`]:\s*true/i)?.[1]
    || diagnostic.match(/Cannot write file .* because it will overwrite tsbuildinfo file generated by referenced project ['"`]([^'"`]+tsconfig[^'"`]*)['"`]/i)?.[1];
  if (compositeConfigPath) {
    const targetPath = normalizeTypescriptConfigPath(compositeConfigPath);
    if (targetPath) {
      const nextContent = updateTsconfigFile({
        candidateFiles: args.candidateFiles,
        targetPath,
        mutator: (tsconfig) => {
          const compilerOptions = tsconfig.compilerOptions || (tsconfig.compilerOptions = {});
          if (compilerOptions.composite === true) return false;
          compilerOptions.composite = true;
          return true;
        },
      });
      if (nextContent) {
        return {
          path: targetPath,
          newContent: nextContent,
          summary: `Enable \`composite\` in \`${targetPath}\` so the project reference can participate in a TypeScript build graph.`,
          rerunCommand: args.state.rerunCommand,
        };
      }
    }
  }

  return null;
}

function actionableRepairExplanation(state: AgentState): string | null {
  const diagnostic = String(state.diagnosticOutput || "");
  if (/sh:\s+\d+:\s+rimraf:\s+not found/i.test(diagnostic)) {
    return `I inspected the repo and ran \`${state.rerunCommand}\`. The build is blocked because a package script depends on \`rimraf\`, but that binary is not available here. The safest repair is to patch the cleanup script in \`package.json\` to use a Node-based cleanup step or restore the missing tool installation.`;
  }
  const missingModule = diagnostic.match(/Cannot find module ['"`]([^'"`]+)['"`]/i);
  if (missingModule?.[1]) {
    return `I inspected the repo and ran \`${state.rerunCommand}\`. The failing package script points at a missing file or module: \`${missingModule[1]}\`. The next repair should either create that target file or update the package script so it points at the intended entry point.`;
  }
  if (/Cannot find type definition file ['"`]node['"`]/i.test(diagnostic) || /TS2688:/i.test(diagnostic)) {
    return `I inspected the repo and ran \`${state.rerunCommand}\`. The TypeScript build is missing the \`node\` type library declared by tsconfig, so the next repair should add \`@types/node\` in \`package.json\` and rerun the compiler.`;
  }
  if (/moduleResolution['"`]?\s+option\s+to\s+['"`](nodenext|node16|bundler)['"`]/i.test(diagnostic) || /Option ['"`]moduleResolution['"`] must be set to ['"`](nodenext|node16|bundler)['"`]/i.test(diagnostic)) {
    return `I inspected the repo and ran \`${state.rerunCommand}\`. The TypeScript compiler is asking for a different module resolution mode, so the next repair should update the relevant \`tsconfig*.json\` file to align \`moduleResolution\` and \`module\` with that requirement before rerunning build.`;
  }
  if (/Referenced project ['"`][^'"`]+tsconfig[^'"`]*['"`] must have setting ['"`]composite['"`]:\s*true/i.test(diagnostic)) {
    return `I inspected the repo and ran \`${state.rerunCommand}\`. This TypeScript build is using project references, and one referenced config is missing \`composite: true\`. The next repair should patch that specific \`tsconfig*.json\` file and rerun the build graph.`;
  }
  if (/TS2307:/i.test(diagnostic) || /Cannot find module ['"`]vscode['"`]/i.test(diagnostic)) {
    return `I inspected the repo and ran \`${state.rerunCommand}\`. The underlying TypeScript compile step still needs config or dependency repair, so the next move is to inspect \`package.json\`, the relevant \`tsconfig*.json\` file, and the failing source file together before rerunning build.`;
  }
  if (weakFailureOnly(diagnostic) && (state.executedCommands || []).some((command) => /^tsc(?:\s|$)/i.test(command))) {
    return `I inspected the repo and expanded the weak build output down to the direct TypeScript command. The script chain is now confirmed as \`${state.rerunCommand}\` -> \`${(state.executedCommands || []).filter((command) => /^tsc(?:\s|$)/i.test(command)).at(-1)}\`, so the next repair should inspect \`package.json\`, \`tsconfig.json\`, any referenced \`tsconfig.*.json\` files, and the first failing source file before rerunning build.`;
  }
  return null;
}

async function maybeProposePatch(state: AgentState, deps: RinaAgentDeps, events: RinaAgentStreamEvent[]): Promise<RinaAgentResult | null> {
  const diagnostic = String(state.diagnosticOutput || "").trim();
  if (!diagnostic) return null;
  if (!/error|failed|exception|cannot find|referenceerror|not found|TS2307|TS2688/i.test(diagnostic)) return null;

  const commandRepair = await maybeProposeCommandRepair(state, deps, events);
  if (commandRepair) return commandRepair;

  const candidatePaths = Array.from(new Set([
    extractFirstSourceErrorPath(diagnostic, state.cwd),
    ...(state.searchResults || [])
    .map((line) => String(line).split(":")[0])
    .filter(Boolean),
    ...alwaysRepairCandidatePaths(state.listFiles),
  ].filter((value): value is string => !!value)))
    .slice(0, 12);
  if (!candidatePaths.length) {
    return null;
  }

  const candidateFiles: Array<{ path: string; content: string }> = [];
  for (const relativePath of candidatePaths) {
    if (!await consumeToolCall(state)) {
      const explanation = "I stopped here because this task reached the tool-call limit.";
      events.push({ type: "assistant_message", text: explanation });
      events.push({ type: "task_complete", summary: explanation });
      return {
        explanation,
        risk: "medium",
        events,
      };
    }
    const fileResult = await executeTool({ tool: "readFile", path: relativePath }, deps);
    if (!fileResult.ok) continue;
    candidateFiles.push({
      path: relativePath,
      content: String((fileResult.output as { content?: string } | null)?.content || ""),
    });
  }
  if (!candidateFiles.length) return null;

  const deterministicPatch = await deterministicRepairProposal({ state, candidateFiles });
  if (deterministicPatch) {
    const currentFile = candidateFiles.find((file) => file.path === deterministicPatch.path);
    const currentContent = currentFile?.content || "";
    if (currentContent !== deterministicPatch.newContent) {
      const patchBytes = Buffer.byteLength(deterministicPatch.newContent, "utf8");
      if (patchBytes > state.limits.maxPatchBytes) {
        const explanation = `This patch is ${patchBytes} bytes and exceeds the current plan limit.`;
        events.push({
          type: "approval_requested",
          action: "Patch is too large",
          details: explanation,
          payload: {
            path: deterministicPatch.path,
            summary: deterministicPatch.summary,
            patchBytes,
          },
        });
        return {
          explanation,
          risk: "medium",
          confirmation: "Start another run with a higher plan to apply larger patches.",
          events,
        };
      }
      await recordPatchBytes(patchBytes);
      const approval = {
        kind: "file_patch" as const,
        payload: {
          path: deterministicPatch.path,
          summary: deterministicPatch.summary,
          newContent: deterministicPatch.newContent,
          currentContent,
          rerunCommand: deterministicPatch.rerunCommand || state.rerunCommand,
          previousDiagnostic: diagnostic,
        },
      };
      events.push({
        type: "approval_requested",
        action: "Apply file patch",
        details: deterministicPatch.summary,
        payload: approval.payload,
      });
      return {
        explanation: deterministicPatch.summary,
        risk: "medium",
        confirmation: "Approve this patch to apply it and rerun the check.",
        pendingApproval: approval,
        events,
      };
    }
  }

  const patch = await (deps.proposePatchForFailure || proposePatchForFailure)({
    userMessage: state.userMessage,
    cwd: state.cwd,
    packageManager: state.packageManager,
    diagnosticOutput: diagnostic,
    candidateFiles,
    rerunCommand: state.rerunCommand,
  }).catch(() => null);

  if (!patch) return null;
  const currentFile = candidateFiles.find((file) => file.path === patch.path);
  if (!currentFile || currentFile.content === patch.newContent) return null;
  const patchBytes = Buffer.byteLength(patch.newContent, "utf8");
  if (patchBytes > state.limits.maxPatchBytes) {
    const explanation = `This patch is ${patchBytes} bytes and exceeds the current plan limit.`;
    events.push({
      type: "approval_requested",
      action: "Patch is too large",
      details: explanation,
      payload: {
        path: patch.path,
        summary: patch.summary,
        patchBytes,
      },
    });
    return {
      explanation,
      risk: "medium",
      confirmation: "Start another run with a higher plan to apply larger patches.",
      events,
    };
  }
  await recordPatchBytes(patchBytes);

  const approval = {
    kind: "file_patch" as const,
    payload: {
      path: patch.path,
      summary: patch.summary,
      newContent: patch.newContent,
      currentContent: currentFile.content,
      rerunCommand: patch.rerunCommand || state.rerunCommand,
      previousDiagnostic: diagnostic,
    },
  };
  events.push({
    type: "approval_requested",
    action: "Apply file patch",
    details: patch.summary,
    payload: approval.payload,
  });
  return {
    explanation: patch.summary,
    risk: "medium",
    confirmation: "Approve this patch to apply it and rerun the check.",
    pendingApproval: approval,
    events,
  };
}

export async function runAgentLoop(state: AgentState, deps: RinaAgentDeps = {}): Promise<RinaAgentResult> {
  const events: RinaAgentStreamEvent[] = [];
  const maxSteps = state.limits.maxAgentSteps ?? 5;
  events.push({
    type: "assistant_message",
    text: "I’m checking the repo structure, project config, and the strongest safe diagnostic first.",
  });

  for (let step = 0; step < maxSteps; step += 1) {
    const decision = decideNextStep(state);
    if (decision.type === "message") {
      events.push({ type: "assistant_message", text: decision.text });
      continue;
    }
    if (decision.type === "complete") {
      break;
    }

    const policy = evaluateToolCall(decision.call);
    if (policy.kind === "block") {
      return {
        explanation: policy.reason,
        risk: "high",
        events,
      };
    }
    if (policy.kind === "confirm") {
      events.push({
        type: "approval_requested",
        action: `Run ${decision.call.tool}`,
        details: policy.reason,
        payload: decision.call,
      });
      return {
        explanation: policy.reason,
        risk: policy.risk,
        confirmation: policy.reason,
        pendingApproval: {
          kind: "command",
          payload: decision.call,
        },
        events,
      };
    }

    if (!await consumeToolCall(state)) {
      const explanation = "I stopped here because this task reached the tool-call limit.";
      events.push({ type: "assistant_message", text: explanation });
      events.push({ type: "task_complete", summary: explanation });
      return {
        explanation,
        risk: "medium",
        events,
      };
    }
    events.push({
      type: "tool_started",
      tool: decision.call.tool,
      summary: decision.justification,
    });
    const result = await executeTool(decision.call, {
      ...deps,
      cwd: state.cwd,
      timeoutMs: state.limits.maxCommandMs,
    });
    events.push({
      type: "tool_result",
      tool: decision.call.tool,
      summary: summarizeToolResult(result),
      output: result.ok ? summarizeToolResult(result) : result.error,
    });
    updateStateFromToolResult(state, decision.call, result);
  }

  const patchProposal = await maybeProposePatch(state, deps, events);
  if (patchProposal) {
    return patchProposal;
  }

  const diagnostic = String(state.diagnosticOutput || "").trim();
  const success = diagnostic && !/error|failed|exception|cannot find|referenceerror|not found|command failed/i.test(diagnostic);
  const actionableExplanation = !success ? actionableRepairExplanation(state) : null;
  const explanation = success
    ? `I inspected the repo and ran \`${state.rerunCommand}\`. It completed without a clear failure, so I don’t need to change files yet.`
    : actionableExplanation || `I inspected the repo and ran \`${state.rerunCommand}\`. I found a failure signal, but I need a more targeted hint before proposing a safe edit.`;
  events.push({
    type: "task_complete",
    summary: explanation,
  });

  return {
    explanation,
    risk: success ? "low" : "medium",
    events,
  };
}

export async function runRinaAgent(request: RinaAgentRequest, deps: RinaAgentDeps = {}): Promise<RinaAgentResult> {
  const state = buildAgentContext(request, deps);
  return await runAgentLoop(state, deps);
}

export async function continueRinaAgentAfterCommandApproval(
  request: RinaAgentRequest,
  payload: CommandApprovalPayload,
  deps: RinaAgentDeps = {},
): Promise<RinaAgentResult> {
  const cwd = payload.cwd || request.cwd;
  const command = String(payload.command || "").trim();
  if (!command) {
    return {
      explanation: "The approved command payload did not include a runnable command, so I could not continue the repair loop.",
      risk: "high",
      events: [
        {
          type: "task_complete",
          summary: "The approved command payload did not include a runnable command, so the continuation could not proceed.",
        },
      ],
    };
  }

  const events: RinaAgentStreamEvent[] = [
    {
      type: "assistant_message",
      text: `I’m running the approved repair command \`${command}\` and then I’ll rerun the repo check to find the next concrete blocker.`,
    },
    {
      type: "tool_started",
      tool: "runCommand",
      summary: `Run approved repair command: ${command}`,
    },
  ];

  const toolState = buildAgentContext(request, deps);
  if (!await consumeToolCall(toolState)) {
    return {
      explanation: "I stopped here because this task reached the tool-call limit.",
      risk: "medium",
      events: [
        ...events,
        { type: "assistant_message", text: "I stopped here because this task reached the tool-call limit." },
        { type: "task_complete", summary: "I stopped here because this task reached the tool-call limit." },
      ],
    };
  }
  const commandResult = await executeTool(
    { tool: "runCommand", command, cwd },
    { ...deps, cwd, timeoutMs: request.limits?.maxCommandMs },
  );
  events.push({
    type: "tool_result",
    tool: "runCommand",
    summary: summarizeToolResult(commandResult),
    output: commandResult.ok ? summarizeToolResult(commandResult) : commandResult.error,
  });

  if (!commandResult.ok) {
    const commandError = String(commandResult.error || "");
    if (isInstallCommand(command) && (hasWorkspaceProtocolInstallFailure(commandError) || /Command failed:/i.test(commandError))) {
      if (!await consumeToolCall(toolState)) {
        const explanation = "I stopped here because this task reached the tool-call limit.";
        events.push({ type: "assistant_message", text: explanation });
        events.push({ type: "task_complete", summary: explanation });
        return {
          explanation,
          risk: "medium",
          events,
        };
      }
      const packageJsonResult = await executeTool(
        { tool: "readFile", path: "package.json" },
        { ...deps, cwd },
      );
      if (packageJsonResult.ok) {
        const packageJsonText = String((packageJsonResult.output as { content?: string } | null)?.content || "");
        const pkg = parsePackageJson(packageJsonText) as (PackageJsonData & { name?: string }) | null;
        if (pkg) {
          const newContent = patchWorkspaceProtocolDependenciesForStandaloneRepo(cwd, pkg);
          if (newContent && newContent !== packageJsonText) {
            const summary = "Replace standalone `workspace:*` dependency specifiers with sibling `file:` references so install can run in this copied repo.";
            const patchBytes = Buffer.byteLength(newContent, "utf8");
            if (patchBytes > (request.limits?.maxPatchBytes ?? 20_000)) {
              const explanation = `This patch is ${patchBytes} bytes and exceeds the current plan limit.`;
              events.push({
                type: "approval_requested",
                action: "Patch is too large",
                details: explanation,
                payload: {
                  path: "package.json",
                  summary,
                  patchBytes,
                },
              });
              return {
                explanation,
                risk: "medium",
                confirmation: "Start another run with a higher plan to apply larger patches.",
                events,
              };
            }
            await recordPatchBytes(patchBytes);
            const approval = {
              kind: "file_patch" as const,
              payload: {
                path: "package.json",
                summary,
                newContent,
                currentContent: packageJsonText,
                rerunCommand: command,
                previousDiagnostic: commandError,
              },
            };
            events.push({
              type: "approval_requested",
              action: "Apply file patch",
              details: summary,
              payload: approval.payload,
            });
            return {
              explanation: summary,
              risk: "medium",
              confirmation: "Approve this patch to replace workspace protocol dependencies with local file references and retry the install.",
              pendingApproval: approval,
              events,
            };
          }
        }
      }
    }
    const explanation = `I ran the approved command \`${command}\`, but it failed before the repo could advance to the next blocker.`;
    events.push({ type: "task_complete", summary: explanation });
    return {
      explanation,
      risk: "medium",
      events,
    };
  }

  const followUp = await runRinaAgent(
    {
      ...request,
      cwd,
    },
    {
      ...deps,
      cwd,
    },
  );

  return {
    ...followUp,
    events: [...events, ...followUp.events],
  };
}
