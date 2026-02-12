import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, "dist-electron");

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

console.log("Static assets copied to dist-electron/");
