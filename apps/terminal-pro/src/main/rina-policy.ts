import type { RinaToolCall } from "./rina-tools.js";

export type RinaPolicyDecision =
  | { kind: "allow" }
  | { kind: "confirm"; reason: string; risk: "medium" | "high" }
  | { kind: "block"; reason: string };

const SAFE_COMMAND_PATTERNS = [
  /^pwd$/i,
  /^git status(?:\s|$)/i,
  /^npm (?:run )?(?:build|test|lint|compile)(?:\s|$)/i,
  /^pnpm (?:run )?(?:build|test|lint|compile)(?:\s|$)/i,
  /^yarn (?:build|test|lint|compile)(?:\s|$)/i,
  /^bun (?:run )?(?:build|test|lint|compile)(?:\s|$)/i,
  /^tsc(?:\s|$)/i,
  /^pytest(?:\s|$)/i,
  /^python -m pytest(?:\s|$)/i,
  /^cargo (?:build|test)(?:\s|$)/i,
  /^go test(?:\s|$)/i,
];

const CONFIRM_COMMAND_PATTERNS = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|update|upgrade)\b/i,
  /\bgit (?:apply|checkout|switch|restore|clean|reset)\b/i,
];

const BLOCK_COMMAND_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\bsudo\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
];

export function evaluateToolCall(call: RinaToolCall): RinaPolicyDecision {
  switch (call.tool) {
    case "listFiles":
    case "readFile":
    case "searchInFiles":
    case "getGitStatus":
      return { kind: "allow" };
    case "applyPatch":
      return { kind: "confirm", reason: "Rina wants to modify a file in your workspace.", risk: "medium" };
    case "runCommand": {
      const command = String(call.command || "").trim();
      if (BLOCK_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
        return { kind: "block", reason: "That command is destructive or outside the current product scope." };
      }
      if (SAFE_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
        return { kind: "allow" };
      }
      if (CONFIRM_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
        return { kind: "confirm", reason: "That command changes local project state.", risk: "medium" };
      }
      return { kind: "confirm", reason: "Rina is requesting a command that needs review first.", risk: "high" };
    }
  }
}
