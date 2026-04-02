import { TOKENS } from "../../../../../packages/runtime-contracts/dist/index.js";
import type {
  WorkspaceService,
} from "../../../../../packages/runtime-contracts/dist/index.js";
import type { RuntimeKernel } from "../../../../../packages/runtime-core/dist/index.js";

let frameworkRuntime: RuntimeKernel | null = null;

export function setFrameworkRuntime(kernel: RuntimeKernel | null): void {
  frameworkRuntime = kernel;
}

export function getFrameworkRuntime(): RuntimeKernel | null {
  return frameworkRuntime;
}

export function getWorkspaceService(): WorkspaceService | null {
  const kernel = frameworkRuntime;

  if (!kernel) {
    return null;
  }

  try {
    return kernel.container.resolve(TOKENS.workspaceService);
  } catch {
    return null;
  }
}

export function resolveSharedWorkspaceCwd(input?: string): string {
  const workspace = getWorkspaceService();

  if (workspace) {
    return workspace.resolveCwd(input);
  }

  return typeof input === "string" && input.trim() ? input : process.cwd();
}

export async function hasSharedWorkspaceFile(
  projectRoot: string,
  relativePath: string,
): Promise<boolean> {
  const workspace = getWorkspaceService();

  if (!workspace) {
    return false;
  }

  try {
    await workspace.readFile(projectRoot, relativePath);
    return true;
  } catch {
    return false;
  }
}

export async function readSharedWorkspaceTextFile(
  projectRoot: string,
  relativePath: string,
): Promise<string | null> {
  const workspace = getWorkspaceService();

  if (!workspace) {
    return null;
  }

  try {
    return await workspace.readFile(projectRoot, relativePath);
  } catch {
    return null;
  }
}

export async function listSharedWorkspaceFiles(
  projectRoot: string,
  options?: {
    limit?: number;
    query?: string;
  },
): Promise<string[] | null> {
  const workspace = getWorkspaceService();

  if (!workspace) {
    return null;
  }

  try {
    const resolvedProjectRoot = workspace.resolveCwd(projectRoot);
    return Array.from(await workspace.listFiles(resolvedProjectRoot, options));
  } catch {
    return null;
  }
}
