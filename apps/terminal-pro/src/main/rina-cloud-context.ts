import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { RinaCloudChatRequest } from "./rina-cloud-client.js";

const SECRET_VALUE = "[redacted]";
const MAX_FILE_SUMMARY_BYTES = 1_200;

function detectPackageManager(projectRoot: string): RinaCloudChatRequest["workspace"]["packageManager"] {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "package-lock.json"))) return "npm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "unknown";
}

export function redactLikelySecrets(input: string): string {
  let value = String(input || "");
  value = value.replace(/sk-[A-Za-z0-9_-]{16,}/g, SECRET_VALUE);
  value = value.replace(/gh[pousr]_[A-Za-z0-9_]{16,}/g, SECRET_VALUE);
  value = value.replace(/xox[baprs]-[A-Za-z0-9-]{16,}/g, SECRET_VALUE);
  value = value.replace(/AKIA[0-9A-Z]{16}/g, SECRET_VALUE);
  value = value.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    SECRET_VALUE,
  );
  value = value.replace(
    /\b([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY)[A-Z0-9_]*)\s*[:=]\s*["']?[^"'\s,}]+["']?/gi,
    (_match, key: string) => `${key}=${SECRET_VALUE}`,
  );
  return value;
}

function safeJsonObject(value: unknown): object | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as object;
}

function summarizePackageJson(text: string): { summary: string; json?: object; name?: string } {
  try {
    const parsed = JSON.parse(redactLikelySecrets(text)) as {
      name?: string;
      description?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const scripts = Object.keys(parsed.scripts || {}).slice(0, 12);
    const deps = Object.keys(parsed.dependencies || {}).slice(0, 8);
    const devDeps = Object.keys(parsed.devDependencies || {}).slice(0, 8);
    return {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      json: safeJsonObject(parsed),
      summary: [
        parsed.name ? `package=${parsed.name}` : null,
        parsed.description ? `description=${parsed.description}` : null,
        scripts.length ? `scripts=${scripts.join(", ")}` : null,
        deps.length ? `deps=${deps.join(", ")}` : null,
        devDeps.length ? `devDeps=${devDeps.join(", ")}` : null,
      ].filter(Boolean).join(" | "),
    };
  } catch {
    return { summary: redactLikelySecrets(text).replace(/\s+/g, " ").trim().slice(0, MAX_FILE_SUMMARY_BYTES) };
  }
}

async function listWorkspaceFiles(projectRoot: string): Promise<string[]> {
  const priority = [
    "package.json",
    "README.md",
    "readme.md",
    "tsconfig.json",
    "vite.config.ts",
    "vitest.config.ts",
    "jest.config.ts",
    "playwright.config.ts",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
  ];
  const result: string[] = [];
  for (const file of priority) {
    try {
      const stat = await fsp.stat(path.join(projectRoot, file));
      if (stat.isFile()) result.push(file);
    } catch {
      // Missing files are expected across different project types.
    }
  }
  return result.slice(0, 10);
}

async function summarizeFile(projectRoot: string, relativePath: string): Promise<{ path: string; summary?: string }> {
  try {
    const fullPath = path.join(projectRoot, relativePath);
    const text = await fsp.readFile(fullPath, "utf8");
    if (relativePath === "package.json") {
      return { path: relativePath, summary: summarizePackageJson(text).summary };
    }
    return {
      path: relativePath,
      summary: redactLikelySecrets(text).replace(/\s+/g, " ").trim().slice(0, MAX_FILE_SUMMARY_BYTES),
    };
  } catch {
    return { path: relativePath };
  }
}

export async function buildRinaCloudWorkspace(projectRoot: string): Promise<RinaCloudChatRequest["workspace"]> {
  const files = await listWorkspaceFiles(projectRoot);
  const fileSummaries = await Promise.all(files.map((file) => summarizeFile(projectRoot, file)));
  let packageJson: object | undefined;
  let packageName = path.basename(projectRoot);

  try {
    const packageText = await fsp.readFile(path.join(projectRoot, "package.json"), "utf8");
    const parsed = summarizePackageJson(packageText);
    packageJson = parsed.json;
    packageName = parsed.name || packageName;
  } catch {
    packageJson = undefined;
  }

  return {
    name: redactLikelySecrets(packageName),
    packageManager: detectPackageManager(projectRoot),
    files: fileSummaries,
    packageJson,
  };
}
