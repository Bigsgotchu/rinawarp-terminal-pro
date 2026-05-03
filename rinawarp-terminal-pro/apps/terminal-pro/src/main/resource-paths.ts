import { resolveResourcePath as resolveMainResourcePath } from "./resources.js";

export function resolveResourcePath(
  relPath: string,
  devBase: "repo" | "app",
  roots: { repoRoot: string; appProjectRoot: string; dirname: string },
): string {
  return resolveMainResourcePath({
    relPath,
    devBase,
    repoRoot: roots.repoRoot,
    appProjectRoot: roots.appProjectRoot,
    dirname: roots.dirname,
  });
}
