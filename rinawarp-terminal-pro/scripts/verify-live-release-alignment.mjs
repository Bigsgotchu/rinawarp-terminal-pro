#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const base = (process.argv[2] || "https://rinawarptech.com").replace(/\/+$/, "");
const root = path.resolve(process.cwd());
const appPkgPath = path.join(root, "apps/terminal-pro/package.json");
const localVersion = JSON.parse(fs.readFileSync(appPkgPath, "utf8")).version;
const failures = [];
const missingManifestEntries = [];
const missingChecksums = [];

const requiredRoutes = [
  { key: "windows", route: "/download/windows", suffix: ".exe", manifestKeys: ["windows", "windowsExe", "exe"] },
  { key: "linux", route: "/download/linux", suffix: ".AppImage", manifestKeys: ["linux", "linuxAppImage", "appImage"] },
  { key: "deb", route: "/download/linux/deb", suffix: ".deb", manifestKeys: ["deb", "linuxDeb"] },
];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`PASS: ${message}`);
}

function normalizeHeaders(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) out[key.toLowerCase()] = value;
  return out;
}

function filenameFromDisposition(value) {
  const match = String(value || "").match(/filename\*?=(?:UTF-8''|")?([^";\n\r]+)/i);
  return match ? decodeURIComponent(match[1].replace(/^"|"$/g, "")) : "";
}

function versionFromFilename(filename) {
  const match = String(filename || "").match(/RinaWarp-Terminal-Pro-(\d+\.\d+\.\d+)/);
  return match?.[1] || "";
}

async function headRoute(route) {
  const response = await fetch(`${base}${route}`, { method: "HEAD", redirect: "follow" });
  const headers = normalizeHeaders(response.headers);
  const filename = filenameFromDisposition(headers["content-disposition"]);
  return {
    route,
    status: response.status,
    contentType: headers["content-type"] || "",
    filename,
    version: versionFromFilename(filename),
  };
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function getManifestFile(manifest, route) {
  const files = manifest?.files || {};
  const downloads = manifest?.downloads || {};
  for (const key of route.manifestKeys) {
    const direct = files[key] || downloads[key];
    if (direct?.name) return direct.name;
    if (direct?.file) return direct.file;
    if (typeof direct === "string") return direct;
  }
  const platformFile = route.key === "linux" ? manifest?.platforms?.["linux-x86_64"]?.url : "";
  if (platformFile) return path.basename(String(platformFile));
  return "";
}

console.log("== Live Release Alignment ==");
console.log(`Base: ${base}`);
console.log(`Local apps/terminal-pro version: ${localVersion}`);
console.log("");

const routeResults = [];
for (const route of requiredRoutes) {
  const result = await headRoute(route.route);
  routeResults.push({ ...route, ...result });
  if (result.status !== 200) {
    fail(`${route.route} returned HTTP ${result.status}`);
  } else if (!result.filename) {
    fail(`${route.route} did not expose a Content-Disposition filename`);
  } else if (!result.filename.endsWith(route.suffix)) {
    fail(`${route.route} served ${result.filename}, expected ${route.suffix}`);
  } else {
    ok(`${route.route} serves ${result.filename}`);
  }
}

const routeVersions = [...new Set(routeResults.map((r) => r.version).filter(Boolean))];
if (routeVersions.length !== 1) {
  fail(`download routes disagree on version: ${routeVersions.join(", ") || "(none)"}`);
} else {
  ok(`download routes agree on version ${routeVersions[0]}`);
}

const liveVersion = routeVersions[0] || "";
if (liveVersion && liveVersion !== localVersion) {
  fail(`local app version ${localVersion} does not match live download version ${liveVersion}`);
} else if (liveVersion) {
  ok(`local app version matches live download version ${liveVersion}`);
}

const latest = await fetchJson(`${base}/releases/latest.json`);
if (String(latest.version || "") !== liveVersion) {
  fail(`latest.json version ${latest.version || "(missing)"} does not match download routes ${liveVersion || "(unknown)"}`);
} else {
  ok(`latest.json version matches ${liveVersion}`);
}

for (const route of routeResults) {
  const manifestFile = getManifestFile(latest, route);
  if (!manifestFile) {
    missingManifestEntries.push(route.filename);
    fail(`latest.json missing ${route.key} artifact entry for ${route.filename}`);
  } else if (manifestFile !== route.filename) {
    fail(`latest.json ${route.key} artifact is ${manifestFile}, but route serves ${route.filename}`);
  } else {
    ok(`latest.json includes ${route.filename}`);
  }
}

const checksums = await fetchText(`${base}/download/checksums`);
for (const route of routeResults) {
  if (!checksums.includes(route.filename)) {
    missingChecksums.push(route.filename);
    fail(`SHASUMS256.txt missing ${route.filename}`);
  } else {
    ok(`SHASUMS256.txt includes ${route.filename}`);
  }
}

const ymlText = await fetchText(`${base}/releases/latest.yml`);
if (!ymlText.includes(`version: ${liveVersion}`)) {
  fail(`latest.yml does not declare version ${liveVersion}`);
} else {
  ok(`latest.yml declares version ${liveVersion}`);
}

const linuxYmlText = await fetchText(`${base}/releases/latest-linux.yml`);
const appImage = routeResults.find((r) => r.key === "linux")?.filename || "";
if (!linuxYmlText.includes(`version: ${liveVersion}`) || !linuxYmlText.includes(appImage)) {
  fail(`latest-linux.yml does not match ${liveVersion} / ${appImage}`);
} else {
  ok(`latest-linux.yml matches ${liveVersion} / ${appImage}`);
}

if (process.exitCode) {
  console.error("");
  console.error("Release alignment failed.");
  console.error("");
  console.error("Expected local version:");
  console.error(`  apps/terminal-pro: ${localVersion}`);
  console.error("");
  console.error("Observed live artifacts:");
  for (const route of routeResults) {
    console.error(`  ${route.route}: ${route.filename || "(missing filename)"}${route.version ? ` (${route.version})` : ""}`);
  }
  console.error("");
  console.error("Missing latest.json entries:");
  console.error(`  ${missingManifestEntries.length ? missingManifestEntries.join("\n  ") : "(none)"}`);
  console.error("");
  console.error("Missing SHASUMS256.txt entries:");
  console.error(`  ${missingChecksums.length ? missingChecksums.join("\n  ") : "(none)"}`);
  console.error("");
  console.error("Files to regenerate and republish together:");
  for (const route of routeResults) {
    console.error(`  ${route.filename || `${route.key} installer`}`);
  }
  console.error("  latest.json");
  console.error("  latest.yml");
  console.error("  latest-linux.yml");
  console.error("  SHASUMS256.txt");
  console.error("");
  console.error("Recommended next release step:");
  console.error("  bump apps/terminal-pro to the intended version, build all installer targets, regenerate metadata/checksums, publish atomically, then rerun npm run verify:release-alignment.");
  process.exit(process.exitCode);
}

console.log("");
console.log("PASS: Live release alignment passed");
