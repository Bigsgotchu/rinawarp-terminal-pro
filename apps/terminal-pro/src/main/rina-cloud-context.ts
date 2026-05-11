import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { RinaCloudChatRequest } from "./rina-cloud-client.js";

const SECRET_VALUE = "[redacted]";
const MAX_FILE_SUMMARY_BYTES = 1_200;
const MAX_TREE_FILES = 120;
const MAX_DOC_SUMMARY_BYTES = 1_600;

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

function safeStringMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    if (typeof raw === "string") output[key] = redactLikelySecrets(raw).slice(0, 300);
  }
  return output;
}

function dependencyNames(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).sort().slice(0, 40);
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

async function listProjectTree(projectRoot: string): Promise<string[]> {
  const ignoredDirs = new Set([
    ".git",
    ".next",
    ".nuxt",
    ".vite",
    "build",
    "coverage",
    "dist",
    "dist-electron",
    "node_modules",
    "out",
    "playwright-report",
    "test-results",
  ]);
  const files: string[] = [];

  async function walk(relativeDir: string, depth: number): Promise<void> {
    if (files.length >= MAX_TREE_FILES || depth > 3) return;
    const fullDir = path.join(projectRoot, relativeDir);
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(fullDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (files.length >= MAX_TREE_FILES) return;
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

function summarizeDocText(text: string): string {
  const clean = redactLikelySecrets(text)
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !/^[-=*`]+$/.test(line))
    .slice(0, 24)
    .join(" ");
  return clean.replace(/\s+/g, " ").trim().slice(0, MAX_DOC_SUMMARY_BYTES);
}

async function collectWorkspaceDocs(projectRoot: string, tree: string[]): Promise<{
  readme?: { path: string; summary: string };
  docs: Array<{ path: string; summary: string }>;
}> {
  const docPaths = tree
    .filter((file) =>
      /(^|\/)readme(?:\.[a-z0-9]+)?$/i.test(file) ||
      /^docs\/.+\.(md|mdx|txt)$/i.test(file) ||
      /(^|\/)(architecture|overview|getting-started|setup)\.(md|mdx|txt)$/i.test(file)
    )
    .slice(0, 8);
  const docs: Array<{ path: string; summary: string }> = [];
  for (const docPath of docPaths) {
    try {
      const summary = summarizeDocText(await fsp.readFile(path.join(projectRoot, docPath), "utf8"));
      if (summary) docs.push({ path: docPath, summary });
    } catch {
      // Ignore unreadable docs.
    }
  }
  const readme = docs.find((doc) => /(^|\/)readme/i.test(doc.path));
  return { readme, docs: docs.filter((doc) => doc.path !== readme?.path) };
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
  const tree = await listProjectTree(projectRoot);
  const docs = await collectWorkspaceDocs(projectRoot, tree);
  const fileSummaries = await Promise.all(files.map((file) => summarizeFile(projectRoot, file)));
  let packageJson: object | undefined;
  let packageName = path.basename(projectRoot);
  let scripts: Record<string, string> | undefined;
  let dependencies: string[] | undefined;
  let devDependencies: string[] | undefined;

  try {
    const packageText = await fsp.readFile(path.join(projectRoot, "package.json"), "utf8");
    const parsed = summarizePackageJson(packageText);
    packageJson = parsed.json;
    packageName = parsed.name || packageName;
    const packageObject = packageJson as {
      scripts?: unknown;
      dependencies?: unknown;
      devDependencies?: unknown;
    } | undefined;
    scripts = safeStringMap(packageObject?.scripts);
    dependencies = dependencyNames(packageObject?.dependencies);
    devDependencies = dependencyNames(packageObject?.devDependencies);
  } catch {
    packageJson = undefined;
  }

  return {
    name: redactLikelySecrets(packageName),
    packageManager: detectPackageManager(projectRoot),
    files: fileSummaries,
    tree,
    readme: docs.readme,
    docs: docs.docs,
    scripts,
    dependencies,
    devDependencies,
    packageJson,
  };
}
