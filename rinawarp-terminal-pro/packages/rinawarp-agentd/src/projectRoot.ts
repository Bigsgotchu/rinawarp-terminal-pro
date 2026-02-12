import path from "node:path";
import fs from "node:fs";

function isWithinRoot(root: string, candidate: string) {
  const rel = path.relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

const ALLOWED_WORKSPACE_ROOTS = process.env.RINAWARP_ALLOWED_ROOTS
  ? process.env.RINAWARP_ALLOWED_ROOTS.split(path.delimiter).filter(Boolean)
  : [];

export function normalizeProjectRoot(raw: string) {
  if (!raw || typeof raw !== "string") throw new Error("projectRoot is required");
  const resolved = path.resolve(raw);

  // block obvious foot-guns
  if (resolved === path.parse(resolved).root) throw new Error("Refusing projectRoot at filesystem root.");

  const st = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
  if (!st || !st.isDirectory()) throw new Error("projectRoot must exist and be a directory.");

  if (ALLOWED_WORKSPACE_ROOTS.length > 0) {
    const ok = ALLOWED_WORKSPACE_ROOTS.some((r) => isWithinRoot(path.resolve(r), resolved));
    if (!ok) throw new Error("projectRoot not allowed by server policy.");
  }

  return resolved;
}
