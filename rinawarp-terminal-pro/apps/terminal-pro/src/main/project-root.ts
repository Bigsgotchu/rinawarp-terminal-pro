import {
  normalizeProjectRoot as normalizeProjectRootFromSecurity,
  resolveProjectRootSafe as resolveProjectRootSafeFromSecurity,
} from "../security/projectRoot.js";

const ALLOWED_WORKSPACE_ROOTS: string[] = [];

export function normalizeProjectRoot(input: string, workspaceRoot?: string): string {
  return normalizeProjectRootFromSecurity({
    input,
    workspaceRoot,
    allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
  });
}

export function resolveProjectRootSafe(input?: string): string {
  return resolveProjectRootSafeFromSecurity({
    input,
    allowedWorkspaceRoots: ALLOWED_WORKSPACE_ROOTS,
  });
}
