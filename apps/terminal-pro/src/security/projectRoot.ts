import fs from "node:fs";
import path from "node:path";

export function canonicalizePath(input: string): string {
  const resolved = path.resolve(input);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

export function isWithinRoot(resolved: string, root: string): boolean {
  const safeResolved = canonicalizePath(resolved);
  const safeRoot = canonicalizePath(root);
  if (safeResolved === safeRoot) return true;
  const rel = path.relative(safeRoot, safeResolved);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

export function normalizeProjectRoot(args: {
  input: string;
  workspaceRoot?: string;
  allowedWorkspaceRoots?: string[];
}): string {
  const resolved = canonicalizePath(args.input);
  const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;

  if (!stat || !stat.isDirectory()) {
    throw new Error(`Invalid projectRoot: "${args.input}" is not a valid directory`);
  }

  if (args.workspaceRoot && !isWithinRoot(resolved, args.workspaceRoot)) {
    throw new Error(`Invalid projectRoot: "${args.input}" is outside allowed workspace`);
  }

  const allowedRoots = args.allowedWorkspaceRoots || [];
  if (!args.workspaceRoot && allowedRoots.length > 0) {
    const allowed = allowedRoots.some((root) => isWithinRoot(resolved, root));
    if (!allowed) {
      throw new Error(`Invalid projectRoot: "${args.input}" is outside configured workspace roots`);
    }
  }

  return resolved;
}

export function resolveProjectRootSafe(args: {
  input?: string;
  allowedWorkspaceRoots?: string[];
}): string {
  const raw = String(args.input || "").trim();
  if (raw) {
    try {
      return normalizeProjectRoot({ input: raw, allowedWorkspaceRoots: args.allowedWorkspaceRoots });
    } catch {
      // fall through
    }
  }
  return normalizeProjectRoot({ input: process.cwd(), allowedWorkspaceRoots: args.allowedWorkspaceRoots });
}
