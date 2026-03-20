import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outdir = path.join(repoRoot, "website", ".pages-dist");
const entry = path.join(repoRoot, "website", "pages", "_worker.ts");

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [entry],
  outfile: path.join(outdir, "_worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  minify: false,
  logLevel: "info",
});

console.log(`Built Pages worker bundle: ${path.join(outdir, "_worker.js")}`);
