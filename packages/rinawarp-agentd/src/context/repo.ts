/**
 * Repo Context
 * 
 * Collects Git repository information.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface RepoInfo {
  isGitRepo: boolean;
  root: string | null;
  branch: string | null;
  status: string | null;
  remotes: { name: string; url: string }[];
  packageManager: string | null;
  language: string | null;
}

/**
 * Collect repo info
 */
export function collectRepoInfo(cwd: string): RepoInfo {
  const root = findGitRoot(cwd);
  
  if (!root) {
    return {
      isGitRepo: false,
      root: null,
      branch: null,
      status: null,
      remotes: [],
      packageManager: detectPackageManager(cwd),
      language: detectLanguage(cwd),
    };
  }

  return {
    isGitRepo: true,
    root,
    branch: getBranch(root),
    status: getStatus(root),
    remotes: getRemotes(root),
    packageManager: detectPackageManager(root),
    language: detectLanguage(root),
  };
}

function findGitRoot(cwd: string): string | null {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf-8",
    }).trim();
    return root;
  } catch {
    return null;
  }
}

function getBranch(root: string): string | null {
  try {
    return execSync("git branch --show-current", {
      cwd: root,
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

function getStatus(root: string): string | null {
  try {
    const status = execSync("git status --short", {
      cwd: root,
      encoding: "utf-8",
    }).trim();
    return status || "clean";
  } catch {
    return null;
  }
}

function getRemotes(root: string): { name: string; url: string }[] {
  try {
    const output = execSync("git remote -v", {
      cwd: root,
      encoding: "utf-8",
    });
    
    const remotes: { name: string; url: string }[] = [];
    for (const line of output.trim().split("\n")) {
      const match = line.match(/^(\S+)\s+(\S+)/);
      if (match) {
        remotes.push({ name: match[1], url: match[2] });
      }
    }
    return remotes;
  } catch {
    return [];
  }
}

function detectPackageManager(cwd: string): string | null {
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "Cargo.lock"))) return "cargo";
  if (fs.existsSync(path.join(cwd, "go.sum"))) return "go";
  if (fs.existsSync(path.join(cwd, "Pipfile.lock"))) return "pipenv";
  if (fs.existsSync(path.join(cwd, "requirements.txt"))) return "pip";
  if (fs.existsSync(path.join(cwd, "poetry.lock"))) return "poetry";
  return null;
}

function detectLanguage(cwd: string): string | null {
  if (fs.existsSync(path.join(cwd, "package.json"))) return "JavaScript/TypeScript";
  if (fs.existsSync(path.join(cwd, "Cargo.toml"))) return "Rust";
  if (fs.existsSync(path.join(cwd, "go.mod"))) return "Go";
  if (fs.existsSync(path.join(cwd, "requirements.txt"))) return "Python";
  if (fs.existsSync(path.join(cwd, "pom.xml"))) return "Java";
  if (fs.existsSync(path.join(cwd, "build.gradle"))) return "Kotlin";
  if (fs.existsSync(path.join(cwd, "main.swift"))) return "Swift";
  if (fs.existsSync(path.join(cwd, "main.cs"))) return "C#";
  return null;
}

/**
 * Convert to prompt string
 */
export function repoToPromptString(info: RepoInfo): string {
  if (!info.isGitRepo) {
    return `Not a Git repository`;
  }

  let s = `Git Repository: ${info.root || "unknown"}
Branch: ${info.branch || "unknown"}
Status: ${info.status || "unknown"}
`;
  
  if (info.remotes.length > 0) {
    s += "Remotes:\n";
    for (const remote of info.remotes) {
      s += `  ${remote.name}: ${remote.url}\n`;
    }
  }
  
  if (info.language) s += `Language: ${info.language}\n`;
  if (info.packageManager) s += `Package Manager: ${info.packageManager}\n`;
  
  return s;
}
