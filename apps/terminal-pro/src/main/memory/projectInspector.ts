import path from "node:path";
import { extractWorkspaceFacts, type ProjectConfigInput } from "./workspaceFactExtractor.js";
import type { WorkspaceFact } from "./memoryTypes.js";

export type ProjectInspectionResult = {
  packageManager: string | null;
  framework: string | null;
  frameworks: string[];
  isElectron: boolean;
  canDeploy: boolean;
  authPackages: string[];
  databasePackages: string[];
  facts: WorkspaceFact[];
};

const AUTH_PATTERNS = /auth|oauth|passport|clerk|next-auth|supabase|firebase|stripe|jwt|session/i;
const DATABASE_PATTERNS = /prisma|mongoose|sequelize|typeorm|sqlite|better-sqlite3|postgres|mysql|redis|mongodb/i;
const FRAMEWORK_PATTERNS: Record<string, RegExp> = {
  vite: /vite|vite\.config/i,
  next: /next/i,
  react: /react/i,
  vue: /vue/i,
  svelte: /svelte/i,
  angular: /angular/i,
  express: /express/i,
  fastify: /fastify/i,
  nest: /nest/i,
  python: /python|requests|flask|django/i,
  rust: /rust|cargo/i,
  go: /go|gin|echo/i,
};

function detectPackageManagerFromListFiles(listFiles: string[]): "pnpm" | "npm" | "yarn" | "bun" | null {
  if (listFiles.includes("pnpm-lock.yaml")) return "pnpm";
  if (listFiles.includes("package-lock.json")) return "npm";
  if (listFiles.includes("yarn.lock")) return "yarn";
  if (listFiles.includes("bun.lock") || listFiles.includes("bun.lockb")) return "bun";
  return null;
}

function detectFrameworks(listFiles: string[], packageJson: unknown): string[] {
  const detected: string[] = [];
  const json = typeof packageJson === "object" && packageJson ? (packageJson as Record<string, unknown>) : {};
  const deps = Object.keys({
    ...(json.dependencies || {}),
    ...(json.devDependencies || {}),
  });

  for (const [name, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
    const hasDepOrFile = deps.some((dep) => pattern.test(dep)) ||
      listFiles.some((file) => pattern.test(file));
    if (hasDepOrFile) detected.push(name);
  }

  return detected;
}

function detectAuthPackages(listFiles: string[], packageJson: unknown): string[] {
  const json = typeof packageJson === "object" && packageJson ? (packageJson as Record<string, unknown>) : {};
  const deps = Object.keys({
    ...(json.dependencies || {}),
    ...(json.devDependencies || {}),
  });

  return deps.filter((dep) => AUTH_PATTERNS.test(dep));
}

function detectDatabasePackages(listFiles: string[], packageJson: unknown): string[] {
  const json = typeof packageJson === "object" && packageJson ? (packageJson as Record<string, unknown>) : {};
  const deps = Object.keys({
    ...(json.dependencies || {}),
    ...(json.devDependencies || {}),
  });

  return deps.filter((dep) => DATABASE_PATTERNS.test(dep));
}

function detectElectron(listFiles: string[], packageJson: unknown): boolean {
  const json = typeof packageJson === "object" && packageJson ? (packageJson as Record<string, unknown>) : {};
  const deps = Object.keys({
    ...(json.dependencies || {}),
    ...(json.devDependencies || {}),
  }).map((d) => d.toLowerCase());

  const hasElectronDep = deps.some((d) => d === "electron" || d.startsWith("electron"));
  const hasElectronConfig = listFiles.some((f) =>
    f === "electron-builder.yml" ||
    f === "electron-builder.json" ||
    f === "electron-builder.yaml" ||
    f === "electron-builder.js" ||
    f === "electron-builder.config.js"
  );

  return hasElectronDep || hasElectronConfig;
}

function detectDeployTargets(listFiles: string[], packageJson: unknown): boolean {
  const json = typeof packageJson === "object" && packageJson ? (packageJson as Record<string, unknown>) : {};
  const scripts = typeof json.scripts === "object" ? (json.scripts as Record<string, string>) : {};

  const hasDeployScript = !!scripts.deploy || !!scripts.publish;
  const hasElectronConfig = listFiles.some((f) =>
    f === "electron-builder.yml" || f === "electron-builder.json"
  );
  const hasVercelConfig = listFiles.includes("vercel.json");
  const hasNetlifyConfig = listFiles.includes("netlify.toml");
  const hasDockerfile = listFiles.includes("Dockerfile");

  return hasDeployScript || hasElectronConfig || hasVercelConfig || hasNetlifyConfig || hasDockerfile;
}

export async function inspectProjectWorkspace(
  projectRoot: string,
  deps: {
    readFile?: (relativePath: string) => Promise<string | null>;
    listFiles?: () => Promise<string[]>;
  } = {}
): Promise<ProjectInspectionResult> {
  const defaultReadFile = async (relativePath: string): Promise<string | null> => {
    const { readFileSync } = await import("node:fs");
    try {
      return readFileSync(path.join(projectRoot, relativePath), "utf8");
    } catch {
      return null;
    }
  };

  const defaultListFiles = async (): Promise<string[]> => {
    const { readdirSync, statSync } = await import("node:fs");
    const ignored = new Set([".git", "node_modules", "dist", "dist-electron", "out", "build"]);
    const files: string[] = [];

    const walk = (dir: string): void => {
      try {
        const entries = readdirSync(path.join(projectRoot, dir || dir === "." ? projectRoot : path.join(projectRoot, dir)));
        for (const entry of entries) {
          if (ignored.has(entry) || entry.startsWith(".")) continue;
          const fullPath = dir ? path.join(dir, entry) : entry;
          const stats = statSync(path.join(projectRoot, fullPath));
          if (stats.isDirectory()) walk(fullPath);
          else files.push(fullPath.replace(/\\/g, "/"));
        }
      } catch {
        // Ignore unreadable directories
      }
    };

    walk(".");
    return files.slice(0, 200);
  };

  const readFile = deps.readFile || defaultReadFile;
  const listFilesInternal = deps.listFiles || defaultListFiles;

  const listFiles = await listFilesInternal();
  const packageJsonText = await readFile("package.json");
  const packageJson = packageJsonText ? JSON.parse(packageJsonText) as unknown : null;

  const packageManager = detectPackageManagerFromListFiles(listFiles);
  const frameworks = detectFrameworks(listFiles, packageJson);
  const isElectron = detectElectron(listFiles, packageJson);
  const canDeploy = detectDeployTargets(listFiles, packageJson);
  const authPackages = detectAuthPackages(listFiles, packageJson);
  const databasePackages = detectDatabasePackages(listFiles, packageJson);

  const configInput: ProjectConfigInput = {
    projectRoot,
    packageManager: packageManager ?? undefined,
    framework: frameworks.length > 0 ? frameworks.join(", ") : undefined,
    runtime: packageManager ? "Node.js" : undefined,
    ui: frameworks.find((f) => ["react", "vue", "svelte", "angular"].includes(f)) || undefined,
    database: databasePackages.length > 0 ? databasePackages.join(", ") : undefined,
    authProvider: authPackages.length > 0 ? authPackages.join(", ") : undefined,
  };

  const facts = extractWorkspaceFacts({ projectConfig: configInput });

  return {
    packageManager,
    framework: frameworks.length > 0 ? frameworks[0] : null,
    frameworks,
    isElectron,
    canDeploy,
    authPackages,
    databasePackages,
    facts,
  };
}