import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";

import type {
  WorkspaceFilePreview,
  WorkspaceService,
} from "../../../runtime-contracts/dist/index.js";

export interface WorkspaceServiceConfig {
  readonly appProjectRoot: string;
  readonly normalizeProjectRoot: (
    input: string,
    workspaceRoot?: string,
  ) => string;
  readonly resolveProjectRootSafe: (input: unknown) => string;
  readonly canonicalizePath: (input: string) => string;
  readonly isWithinRoot: (target: string, root: string) => boolean;
}

const CODE_EXPLORER_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "dist-electron",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
]);

const CODE_EXPLORER_PRIORITY_FILES = new Map([
  ["package.json", 140],
  ["package-lock.json", 110],
  ["pnpm-lock.yaml", 108],
  ["readme.md", 132],
  ["tsconfig.json", 124],
  ["vite.config.ts", 118],
  ["vite.config.js", 118],
  ["wrangler.toml", 116],
  ["electron-builder.yml", 116],
  ["electron-builder.json", 116],
  ["src/main.ts", 126],
  ["src/index.ts", 122],
  ["src/index.tsx", 122],
  ["src/app.ts", 118],
  ["src/app.tsx", 118],
  ["src/renderer.ts", 114],
  ["src/renderer/index.ts", 114],
  ["src/renderer/index.tsx", 114],
]);

function looksLikeAppBundlePath(candidate: string): boolean {
  const normalized = String(candidate || "").replace(/\\/g, "/");
  return (
    normalized.includes("/app.asar") ||
    normalized.includes("/dist-electron/installer/") ||
    normalized.includes("/resources/")
  );
}

function tokenizeSearch(value: string): string[] {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function scoreProjectFile(relativePath: string, query = ""): number {
  const normalizedPath = String(relativePath || "").replace(/\\/g, "/").toLowerCase();
  if (!normalizedPath) {
    return Number.NEGATIVE_INFINITY;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const basename = segments[segments.length - 1] || normalizedPath;
  const depth = Math.max(0, segments.length - 1);
  let score = 0;

  const priorityScore =
    CODE_EXPLORER_PRIORITY_FILES.get(normalizedPath) ??
    CODE_EXPLORER_PRIORITY_FILES.get(basename);
  if (priorityScore) {
    score += priorityScore;
  }

  if (depth === 0) score += 18;
  if (normalizedPath.startsWith("src/")) score += 24;
  if (normalizedPath.includes("/main/")) score += 22;
  if (normalizedPath.includes("/renderer/")) score += 16;
  if (normalizedPath.includes("/workspace/")) score += 14;
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(normalizedPath)) score += 10;
  if (basename.startsWith("index.")) score += 9;
  if (basename.startsWith("app.") || basename.startsWith("main.")) score += 8;
  if (/(^|\/)(test|tests|__tests__|fixtures|mocks)(\/|$)/.test(normalizedPath)) score -= 18;
  if (/\.(spec|test)\./.test(normalizedPath)) score -= 14;
  if (/(^|\/)(docs|coverage|tmp|output|release)(\/|$)/.test(normalizedPath)) score -= 12;
  if (/(^|\/)(scripts)(\/|$)/.test(normalizedPath)) score -= 4;

  score -= depth * 2.25;

  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (normalizedQuery) {
    const tokens = tokenizeSearch(normalizedQuery);
    let matchedTokens = 0;

    if (basename === normalizedQuery || normalizedPath === normalizedQuery) score += 160;
    else if (basename.startsWith(normalizedQuery)) score += 92;
    else if (basename.includes(normalizedQuery)) score += 70;
    else if (normalizedPath.includes(normalizedQuery)) score += 48;

    for (const token of tokens) {
      if (basename === token) {
        score += 34;
        matchedTokens += 1;
        continue;
      }
      if (segments.includes(token)) {
        score += 26;
        matchedTokens += 1;
        continue;
      }
      if (basename.startsWith(token)) {
        score += 21;
        matchedTokens += 1;
        continue;
      }
      if (basename.includes(token)) {
        score += 16;
        matchedTokens += 1;
        continue;
      }
      if (normalizedPath.includes(token)) {
        score += 9;
        matchedTokens += 1;
      }
    }

    if (tokens.length > 0 && matchedTokens === tokens.length) score += 22;
    else if (matchedTokens === 0) score -= 18;
  }

  return Number(score.toFixed(4));
}

function sortProjectFiles(files: readonly string[], query = ""): string[] {
  return [...files].sort((left, right) => {
    const scoreDelta = scoreProjectFile(right, query) - scoreProjectFile(left, query);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.localeCompare(right);
  });
}

export function createWorkspaceService(
  config: WorkspaceServiceConfig,
): WorkspaceService {
  function getDefaultCwd(): string {
    const explicitWorkspaceRoot = String(process.env.RINA_WORKSPACE_ROOT || "").trim();
    if (explicitWorkspaceRoot) {
      return config.resolveProjectRootSafe(explicitWorkspaceRoot);
    }

    const currentWorkingDir = String(process.cwd() || "").trim();
    if (currentWorkingDir && !looksLikeAppBundlePath(currentWorkingDir)) {
      try {
        return config.resolveProjectRootSafe(currentWorkingDir);
      } catch {
        return currentWorkingDir;
      }
    }

    const homeDir = String(process.env.HOME || "").trim();
    if (homeDir && !looksLikeAppBundlePath(homeDir)) {
      try {
        return config.resolveProjectRootSafe(homeDir);
      } catch {
        return homeDir;
      }
    }

    try {
      return config.resolveProjectRootSafe(config.appProjectRoot);
    } catch {
      return config.appProjectRoot;
    }
  }

  function resolveCwd(input: unknown): string {
    if (typeof input !== "string" || !input.trim()) {
      return getDefaultCwd();
    }

    try {
      return config.normalizeProjectRoot(input);
    } catch {
      return getDefaultCwd();
    }
  }

  async function listFiles(
    projectRoot: string,
    options?: { limit?: number; query?: string },
  ): Promise<readonly string[]> {
    const safeRoot = config.normalizeProjectRoot(projectRoot);
    const out: string[] = [];
    const max = Math.max(50, Math.min(Number(options?.limit || 800), 5000));
    const stack = [safeRoot];

    // We cap traversal for responsiveness, then score the collected set.
    while (stack.length > 0 && out.length < max) {
      const dir = stack.pop();
      if (!dir) {
        continue;
      }

      let entries: fs.Dirent[] = [];
      try {
        entries = await fsPromises.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (entry.name.startsWith(".")) {
          if (![".env.example", ".env.local.example"].includes(entry.name)) {
            continue;
          }
        }

        const full = path.join(dir, entry.name);
        if (!config.isWithinRoot(full, safeRoot)) {
          continue;
        }

        if (entry.isDirectory()) {
          if (CODE_EXPLORER_SKIP_DIRS.has(entry.name)) {
            continue;
          }
          stack.push(full);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        out.push(path.relative(safeRoot, full));
        if (out.length >= max) {
          break;
        }
      }
    }

    return sortProjectFiles(out, options?.query).slice(0, max);
  }

  async function readFile(projectRoot: string, relativePath: string): Promise<string> {
    const preview = await readWorkspaceFilePreview(config, {
      projectRoot,
      relativePath,
      maxBytes: 2_000_000,
    });

    if (!preview.ok) {
      throw new Error(preview.error || "Could not read file");
    }

    return preview.content ?? "";
  }

  async function readFilePreview(
    projectRoot: string,
    relativePath: string,
    options?: { maxBytes?: number },
  ): Promise<WorkspaceFilePreview> {
    return readWorkspaceFilePreview(config, {
      projectRoot,
      relativePath,
      maxBytes: options?.maxBytes,
    });
  }

  return {
    getDefaultCwd,
    resolveCwd,
    listFiles,
    readFile,
    readFilePreview,
  };
}

export async function readWorkspaceFilePreview(
  config: WorkspaceServiceConfig,
  args: {
    projectRoot: string;
    relativePath: string;
    maxBytes?: number;
  },
): Promise<WorkspaceFilePreview> {
  const safeRoot = config.normalizeProjectRoot(args.projectRoot);
  const relativePath = String(args.relativePath || "")
    .replace(/\\/g, "/")
    .trim();

  if (!relativePath || relativePath.includes("\0")) {
    return { ok: false, error: "Invalid file path" };
  }

  const full = config.canonicalizePath(path.resolve(safeRoot, relativePath));
  if (!config.isWithinRoot(full, safeRoot)) {
    return { ok: false, error: "File is outside workspace root" };
  }

  let stats: fs.Stats;
  try {
    stats = await fsPromises.stat(full);
  } catch {
    return { ok: false, error: "File not found" };
  }
  if (!stats.isFile()) {
    return { ok: false, error: "File not found" };
  }

  const max = Math.max(1024, Math.min(Number(args.maxBytes || 120_000), 2_000_000));
  const buffer = await fsPromises.readFile(full);
  const raw = buffer.subarray(0, max);
  const content = raw.toString("utf8");
  const looksBinary = content.includes("\u0000");

  if (looksBinary) {
    return {
      ok: true,
      content: "[binary file preview not available]",
      truncated: buffer.length > max,
    };
  }

  return {
    ok: true,
    content,
    truncated: buffer.length > max,
  };
}
