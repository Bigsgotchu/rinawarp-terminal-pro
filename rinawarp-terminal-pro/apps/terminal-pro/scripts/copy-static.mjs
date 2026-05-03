import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "dist-electron");
const repoRoot = path.resolve(projectRoot, "..", "..");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      copyFile(src, dest);
    }
  }
}

const srcHtml = path.join(projectRoot, "src", "renderer.html");
const outHtml = path.join(outDir, "renderer.html");

if (!fs.existsSync(srcHtml)) {
  console.error(`Missing: ${srcHtml}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
copyFile(srcHtml, outHtml);

copyDir(
  path.join(projectRoot, "src", "assets"),
  path.join(outDir, "assets")
);
copyDir(
  path.join(projectRoot, "src", "renderer"),
  path.join(outDir, "renderer")
);
copyDir(
  path.join(projectRoot, "themes"),
  path.join(outDir, "themes")
);
copyDir(
  path.join(repoRoot, "policy"),
  path.join(outDir, "policy")
);

function copyOptional(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Optional asset missing: ${src}`);
    return;
  }
  copyFile(src, dest);
}

function resolveNodeModuleFile(...parts) {
  const candidates = [
    path.join(projectRoot, "node_modules", ...parts),
    path.join(repoRoot, "node_modules", ...parts),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const xtermJs = resolveNodeModuleFile("xterm", "lib", "xterm.js");
const xtermCss = resolveNodeModuleFile("xterm", "css", "xterm.css");
const fitAddonJs = resolveNodeModuleFile("xterm-addon-fit", "lib", "xterm-addon-fit.js");

if (xtermJs) {
  copyFile(xtermJs, path.join(outDir, "vendor", "xterm.js"));
} else {
  console.warn("Optional asset missing: xterm/lib/xterm.js");
}

if (xtermCss) {
  copyFile(xtermCss, path.join(outDir, "vendor", "xterm.css"));
} else {
  console.warn("Optional asset missing: xterm/css/xterm.css");
}

if (fitAddonJs) {
  copyFile(fitAddonJs, path.join(outDir, "vendor", "xterm-addon-fit.js"));
} else {
  console.warn("Optional asset missing: xterm-addon-fit/lib/xterm-addon-fit.js");
}

console.log("Static assets copied to dist-electron/");
