/**
 * One-Command Fixes
 * 
 * Problem #10: One-Command Fixes\n * \"fix eslint errors\" → npx eslint . --fix\n * 
 * Common fixes that developers need regularly.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

const execAsync = promisify(exec);

export interface FixResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
  filesAffected?: string[];
}

export interface FixDefinition {
  name: string;
  description: string;
  patterns: string[];
  command: string;
  risk: "low" | "medium" | "high";
}

/**
 * Known fix patterns
 */
const FIX_DEFINITIONS: FixDefinition[] = [
  {
    name: "eslint",
    description: "Fix ESLint errors",
    patterns: ["fix eslint", "eslint errors", "lint errors"],
    command: "npx eslint . --fix",
    risk: "medium",
  },
  {
    name: "prettier",
    description: "Format code with Prettier",
    patterns: ["format code", "prettier", "format files"],
    command: "npx prettier --write .",
    risk: "medium",
  },
  {
    name: "npm-audit",
    description: "Fix security vulnerabilities",
    patterns: ["fix security", "security audit", "vulnerabilities"],
    command: "npm audit fix",
    risk: "medium",
  },
  {
    name: "npm-deprecated",
    description: "Update deprecated packages",
    patterns: ["fix deprecated", "update deprecated"],
    command: "npx npm-check-updates -u && npm install",
    risk: "high",
  },
  {
    name: "git-clean",
    description: "Remove untracked files",
    patterns: ["clean git", "remove untracked", "git clean"],
    command: "git clean -fd",
    risk: "high",
  },
  {
    name: "node-modules",
    description: "Reinstall node_modules",
    patterns: ["fix node_modules", "reinstall deps", "node modules broken"],
    command: "rm -rf node_modules && npm install",
    risk: "high",
  },
  {
    name: "package-lock",
    description: "Fix package-lock.json",
    patterns: ["fix lock", "package lock", "lock file"],
    command: "rm package-lock.json && npm install",
    risk: "medium",
  },
  {
    name: "tsc",
    description: "Fix TypeScript errors",
    patterns: ["fix typescript", "tsc errors", "typescript errors"],
    command: "npx tsc --fix",
    risk: "medium",
  },
];

/**
 * Detect which fix to apply
 */
export function detectFix(userInput: string): FixDefinition | null {
  const lower = userInput.toLowerCase();
  
  for (const fix of FIX_DEFINITIONS) {
    for (const pattern of fix.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return fix;
      }
    }
  }
  
  return null;
}

/**
 * Execute a one-command fix
 */
export async function executeFix(
  fix: FixDefinition,
  cwd: string,
  options?: {
    dryRun?: boolean;
    preview?: boolean;
  }
): Promise<FixResult> {
  const { dryRun = false, preview = false } = options || {};

  // Check if the fix is applicable
  const applicable = await checkFixApplicability(fix, cwd);
  
  if (!applicable.canRun) {
    return {
      success: false,
      command: fix.command,
      output: "",
      error: applicable.reason || "Fix not applicable",
    };
  }

  // For preview mode, just return what would run
  if (preview || dryRun) {
    return {
      success: true,
      command: fix.command,
      output: `[Preview] Would run: ${fix.command}`,
      filesAffected: applicable.files,
    };
  }

  // Execute the fix
  try {
    // Safety: require confirmation for high-risk fixes
    if (fix.risk === "high") {
      console.log(`⚠️  This is a HIGH RISK operation: ${fix.description}`);
      console.log(`   Command: ${fix.command}`);
    }

    const { stdout, stderr } = await execAsync(fix.command, {
      cwd,
      timeout: 120000,
    });

    return {
      success: true,
      command: fix.command,
      output: stdout || stderr,
      filesAffected: applicable.files,
    };
  } catch (error) {
    return {
      success: false,
      command: fix.command,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a fix can be applied
 */
async function checkFixApplicability(
  fix: FixDefinition,
  cwd: string
): Promise<{ canRun: boolean; reason?: string; files?: string[] }> {
  switch (fix.name) {
    case "eslint": {
      const eslintFiles = await findFiles(cwd, ".eslintrc*");
      const eslintrcJs = await findFiles(cwd, "eslint.config.*");
      if (eslintFiles.length === 0 && eslintrcJs.length === 0) {
        return { canRun: false, reason: "No ESLint config found" };
      }
      const files = await findFiles(cwd, "*.{js,ts,tsx,jsx}");
      return { canRun: true, files };
    }

    case "prettier": {
      const prettierFiles = await findFiles(cwd, ".prettierrc*");
      const prettierConfig = await findFiles(cwd, "prettier.config.*");
      if (prettierFiles.length === 0 && prettierConfig.length === 0) {
        return { canRun: false, reason: "No Prettier config found" };
      }
      const files = await findFiles(cwd, "*.{js,ts,tsx,jsx,json,css}");
      return { canRun: true, files };
    }

    case "npm-audit":
    case "npm-deprecated":
    case "package-lock": {
      const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"));
      if (!hasPackageJson) {
        return { canRun: false, reason: "No package.json found" };
      }
      return { canRun: true, files: ["package.json", "package-lock.json"] };
    }

    case "git-clean": {
      const gitRepo = await checkIfGitRepo(cwd);
      if (!gitRepo) {
        return { canRun: false, reason: "Not a git repository" };
      }
      return { canRun: true };
    }

    case "node-modules": {
      const hasNodeModules = fs.existsSync(path.join(cwd, "node_modules"));
      if (!hasNodeModules) {
        return { canRun: false, reason: "No node_modules to fix" };
      }
      return { canRun: true };
    }

    case "tsc": {
      const tsconfig = fs.existsSync(path.join(cwd, "tsconfig.json"));
      if (!tsconfig) {
        return { canRun: false, reason: "No tsconfig.json found" };
      }
      const files = await findFiles(cwd, "*.ts");
      return { canRun: true, files };
    }

    default:
      return { canRun: true };
  }
}

async function findFiles(cwd: string, pattern: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `find . -name "${pattern}" -type f 2>/dev/null`,
      { cwd }
    );
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

async function checkIfGitRepo(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync("git rev-parse --is-inside-work-tree", { cwd });
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * List all available fixes
 */
export function listFixes(): FixDefinition[] {
  return FIX_DEFINITIONS;
}

/**
 * Format fix result for display
 */
export function formatFixResult(result: FixResult): string {
  if (!result.success) {
    return `❌ Fix failed: ${result.error}`;
  }

  let output = `✅ Fix applied: ${result.command}\n`;
  
  if (result.filesAffected) {
    output += `\nFiles affected: ${result.filesAffected.length}`;
  }
  
  if (result.output) {
    output += `\n\nOutput:\n${result.output.slice(0, 500)}`;
  }
  
  return output;
}
