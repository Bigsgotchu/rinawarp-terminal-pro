import path from "node:path";
import type { RinaToolCall } from "./rina-tools.js";

export type AgentModelDecision =
  | { type: "message"; text: string }
  | { type: "tool_call"; call: RinaToolCall; justification: string }
  | { type: "complete"; summary: string };

export type AgentModelState = {
  userMessage: string;
  cwd: string;
  packageManager: "pnpm" | "npm" | "yarn" | "bun" | "unknown";
  workflow?: "build_recovery";
  cwdInspection?: string | null;
  listFiles?: string[];
  packageJson?: string | null;
  gitStatus?: string | null;
  diagnosticOutput?: string | null;
  searchResults?: string[];
  executedCommands?: string[];
};

function buildDiagnosticCommand(packageJsonText: string | null | undefined, packageManager: AgentModelState["packageManager"]): string {
  if (!packageJsonText) return "git status --short --branch";
  try {
    const pkg = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts || {};
    if (scripts.build) {
      if (packageManager === "pnpm") return "pnpm run build";
      if (packageManager === "yarn") return "yarn build";
      if (packageManager === "bun") return "bun run build";
      return "npm run build";
    }
    if (scripts.test) {
      if (packageManager === "pnpm") return "pnpm test";
      if (packageManager === "yarn") return "yarn test";
      if (packageManager === "bun") return "bun test";
      return "npm test";
    }
  } catch {
    // Ignore parse issues and fall back.
  }
  return "git status --short --branch";
}

function buildRecoveryDiagnosticCommand(packageJsonText: string | null | undefined, packageManager: AgentModelState["packageManager"]): string {
  if (!packageJsonText) return "npm run build";
  try {
    const pkg = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts || {};
    if (scripts.build) {
      if (packageManager === "pnpm") return "pnpm build";
      return "npm run build";
    }
    if (scripts.test) {
      if (packageManager === "pnpm") return "pnpm test";
      return "npm test";
    }
  } catch {
    // Ignore parse issues and fall back to the npm build convention.
  }
  return packageManager === "pnpm" ? "pnpm build" : "npm run build";
}

export function decideNextStep(state: AgentModelState): AgentModelDecision {
  if (state.workflow === "build_recovery" && state.cwdInspection == null) {
    return {
      type: "tool_call",
      call: { tool: "runCommand", command: "pwd", cwd: state.cwd },
      justification: "Confirm the working directory before diagnosing the failed build.",
    };
  }

  if (!state.listFiles) {
    return {
      type: "tool_call",
      call: { tool: "listFiles", path: "." },
      justification: state.workflow === "build_recovery"
        ? "Inspect package manager and project files before running the build."
        : "Inspect the repo structure first.",
    };
  }

  if (state.listFiles.includes("package.json") && state.packageJson == null) {
    return {
      type: "tool_call",
      call: { tool: "readFile", path: "package.json" },
      justification: "Read package.json to find the strongest verification script.",
    };
  }

  if (state.workflow === "build_recovery" && state.diagnosticOutput == null) {
    const diagnosticCommand = buildRecoveryDiagnosticCommand(state.packageJson, state.packageManager);
    return {
      type: "tool_call",
      call: {
        tool: "runCommand",
        command: diagnosticCommand,
        cwd: state.cwd,
      },
      justification: "Run the safest Node build/test command for this package.",
    };
  }

  if (state.gitStatus == null && state.workflow !== "build_recovery") {
    return {
      type: "tool_call",
      call: { tool: "getGitStatus", cwd: state.cwd },
      justification: "Check the current repository state before changing anything.",
    };
  }

  if (state.diagnosticOutput == null) {
    const diagnosticCommand = buildDiagnosticCommand(state.packageJson, state.packageManager);
    return {
      type: "tool_call",
      call: {
        tool: "runCommand",
        command: diagnosticCommand,
        cwd: state.cwd,
      },
      justification: "Run the strongest safe diagnostic for this repo.",
    };
  }

  const expandedCommand = expandWeakDiagnosticCommand({
    packageJsonText: state.packageJson,
    packageManager: state.packageManager,
    diagnosticOutput: state.diagnosticOutput,
    executedCommands: state.executedCommands || [],
  });
  if (expandedCommand) {
    return {
      type: "tool_call",
      call: {
        tool: "runCommand",
        command: expandedCommand,
        cwd: state.cwd,
      },
      justification: "The top-level script output was weak, so inspect the first underlying script step directly.",
    };
  }

  const searchQuery = extractSearchQueryFromOutput(state.diagnosticOutput);
  if (searchQuery && !state.searchResults) {
    return {
      type: "tool_call",
      call: { tool: "searchInFiles", query: searchQuery, path: "." },
      justification: "Search the repo for the symbol or file named in the failure output.",
    };
  }

  return {
    type: "complete",
    summary: "I have enough repo context to summarize the issue and propose the next step.",
  };
}

function extractSearchQueryFromOutput(output: string | null | undefined): string | null {
  const text = String(output || "");
  const tsErrorFile = text.match(/(^|\n)([^()\n]+\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs))\(\d+,\d+\):\s+error\s+TS\d+/i);
  if (tsErrorFile?.[2]) return path.basename(tsErrorFile[2].trim());
  const ts2307 = text.match(/TS2307:\s+Cannot find module ['"`]([^'"`]+)['"`]/i);
  if (ts2307?.[1]) {
    const value = ts2307[1].trim();
    return value.includes("/") || value.includes("\\") ? path.basename(value) : value;
  }
  const missingName = text.match(/Cannot find name ['"`]([^'"`]+)['"`]/i);
  if (missingName?.[1]) return missingName[1];
  const refError = text.match(/ReferenceError:\s+([A-Za-z0-9_$]+)/i);
  if (refError?.[1]) return refError[1];
  const missingModule = text.match(/Cannot find module ['"`]([^'"`]+)['"`]/i);
  if (missingModule?.[1]) {
    const value = missingModule[1].trim();
    return value.includes("/") || value.includes("\\") ? path.basename(value) : value;
  }
  const missingTypes = text.match(/Cannot find type definition file for ['"`]([^'"`]+)['"`]/i);
  if (missingTypes?.[1]) return missingTypes[1];
  const commandNotFound = text.match(/(?:bash|sh|zsh):\s+([^\s:]+): command not found/i);
  if (commandNotFound?.[1]) return commandNotFound[1];
  const shellMissing = text.match(/sh:\s+\d+:\s+([^\s:]+): not found/i);
  if (shellMissing?.[1]) return shellMissing[1];
  return null;
}

function extractScriptNameFromCommand(command: string, packageManager: AgentModelState["packageManager"]): string | null {
  const text = String(command || "").trim();
  const npm = text.match(/^(?:npm|pnpm)\s+run\s+([a-z0-9:_-]+)/i);
  if (npm?.[1]) return npm[1];
  const yarn = text.match(/^yarn\s+([a-z0-9:_-]+)/i);
  if (yarn?.[1] && yarn[1] !== "run") return yarn[1];
  const bun = text.match(/^bun\s+run\s+([a-z0-9:_-]+)/i);
  if (bun?.[1]) return bun[1];
  if (packageManager === "yarn") {
    const plainYarn = text.match(/^yarn\s+([a-z0-9:_-]+)/i);
    if (plainYarn?.[1]) return plainYarn[1];
  }
  return null;
}

function splitScriptSteps(script: string): string[] {
  return String(script || "")
    .split(/\s*&&\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isSafeExpandedDiagnosticCommand(command: string): boolean {
  return [
    /^(?:npm|pnpm)\s+run\s+(?:build|test|lint|compile)(?:\s|$)/i,
    /^yarn\s+(?:build|test|lint|compile)(?:\s|$)/i,
    /^bun\s+run\s+(?:build|test|lint|compile)(?:\s|$)/i,
    /^tsc(?:\s|$)/i,
    /^pytest(?:\s|$)/i,
    /^python -m pytest(?:\s|$)/i,
  ].some((pattern) => pattern.test(String(command || "").trim()));
}

function isWeakDiagnosticOutput(output: string | null | undefined): boolean {
  const text = String(output || "").trim();
  if (!text) return true;
  if (/^Command failed: .*npm run [a-z0-9:_-]+\s*$/i.test(text)) return true;
  if (/^Command failed: .*yarn [a-z0-9:_-]+\s*$/i.test(text)) return true;
  if (/^Command failed: .*bun run [a-z0-9:_-]+\s*$/i.test(text)) return true;
  return text.length < 40;
}

function expandWeakDiagnosticCommand(args: {
  packageJsonText: string | null | undefined;
  packageManager: AgentModelState["packageManager"];
  diagnosticOutput: string | null | undefined;
  executedCommands: string[];
}): string | null {
  if (!isWeakDiagnosticOutput(args.diagnosticOutput)) return null;
  if (!args.packageJsonText) return null;
  const lastCommand = args.executedCommands.at(-1);
  if (!lastCommand) return null;
  const scriptName = extractScriptNameFromCommand(lastCommand, args.packageManager);
  if (!scriptName) return null;

  try {
    const pkg = JSON.parse(args.packageJsonText) as { scripts?: Record<string, string> };
    const scriptText = pkg.scripts?.[scriptName];
    if (!scriptText) return null;
    const firstStep = splitScriptSteps(scriptText)[0];
    if (!firstStep || args.executedCommands.includes(firstStep)) return null;
    if (!isSafeExpandedDiagnosticCommand(firstStep)) return null;
    return firstStep;
  } catch {
    return null;
  }
}

type PatchProposal = {
  path: string;
  newContent: string;
  summary: string;
  rerunCommand?: string | null;
};

type PatchPromptArgs = {
  userMessage: string;
  cwd: string;
  packageManager: AgentModelState["packageManager"];
  diagnosticOutput: string;
  candidateFiles: Array<{ path: string; content: string }>;
  rerunCommand: string;
};

export async function proposePatchForFailure(args: PatchPromptArgs): Promise<PatchProposal | null> {
  void args;
  return null;
}
