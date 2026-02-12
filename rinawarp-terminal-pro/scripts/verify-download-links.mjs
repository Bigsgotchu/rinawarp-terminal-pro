#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const appPkgPath = path.join(root, "apps/terminal-pro/package.json");
const webDir = path.join(root, "rinawarptech-website/web");
const downloadPagePath = path.join(webDir, "download.html");

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

if (!fs.existsSync(appPkgPath)) fail(`Missing ${appPkgPath}`);
if (!fs.existsSync(downloadPagePath)) fail(`Missing ${downloadPagePath}`);

const version = JSON.parse(fs.readFileSync(appPkgPath, "utf8")).version;
const manifestCandidates = [
  path.join(webDir, "releases", `v${version}.json`),
  path.join(root, "rinawarptech-website", "releases", `v${version}.json`),
];
const manifestPath = manifestCandidates.find((p) => fs.existsSync(p));
if (!manifestPath) fail(`Missing release manifest for v${version} in web/releases or releases`);

const html = fs.readFileSync(downloadPagePath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const expectedFiles = [
  `RinaWarp-Terminal-Pro-${version}.AppImage`,
  `RinaWarp-Terminal-Pro-${version}.amd64.deb`,
  `RinaWarp-Terminal-Pro-${version}.exe`,
];

for (const f of expectedFiles) {
  if (!html.includes(f)) fail(`download.html is missing installer filename: ${f}`);
  ok(`download.html references ${f}`);
}

for (const verifyPath of ["/verify/SHASUMS256.txt", "/verify/SHASUMS256.txt.asc", "/verify/RINAWARP_GPG_PUBLIC_KEY.asc"]) {
  if (!html.includes(verifyPath)) fail(`download.html is missing verify link: ${verifyPath}`);
  ok(`download.html has verify link ${verifyPath}`);
}

const manifestFiles = [
  manifest?.downloads?.linuxAppImage?.file ?? manifest?.downloads?.linux?.appImage?.file,
  manifest?.downloads?.linuxDeb?.file ?? manifest?.downloads?.linux?.deb?.file,
  manifest?.downloads?.windowsExe?.file ?? manifest?.downloads?.windows?.exe?.file,
];

for (const mf of manifestFiles) {
  if (!mf) fail("release manifest is missing required download file entries");
  if (!expectedFiles.includes(mf)) fail(`release manifest file mismatch: ${mf}`);
}
ok(`release manifest filenames match website version v${version}`);

console.log("✅ Download link verification passed");
