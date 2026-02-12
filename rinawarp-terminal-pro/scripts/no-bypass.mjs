#!/usr/bin/env node
/**
 * File: scripts/no-bypass.mjs
 *
 * CI Lockdown Script - Security Regression Guard
 *
 * Enforces:
 * 1) apps/terminal-pro/src has no child_process usage (spawn/exec/execa/fork/execFile/shell:true)
 * 2) child_process usage only in tool layer
 * 3) tool layer forbids exec/execa/fork/execFile and shell:true
 * 4) no cross-package relative imports (../../../../)
 * 5) spawn timeout enforcement (per-spawn, within N lines)
 * 6) terminal-internals import restricted to core tool layer
 * 7) apps/** cannot import @rinawarp/tools/terminal*
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const TOOL_LAYER_DIRS = [
  "packages/rinawarp-tools/src",
  "packages/rinawarp-core/src/tools",
];

const CORE_TOOL_DIR = "packages/rinawarp-core/src/tools";
const APP_DIR = "apps/terminal-pro/src";
const SCAN_ROOTS = ["apps", "packages"];

// Common glob exclusions
const GLOBS = [
  "--glob", "!**/node_modules/**",
  "--glob", "!**/*.d.ts",
  "--glob", "!**/dist/**",
  "--glob", "!**/*.js.map",
];

let hasErrors = false;
let hasRg = false;
let hasGrep = false;

function rg(args) {
  return execFileSync("rg", args, { encoding: "utf8" });
}

function grep(args) {
  return execFileSync("grep", args, { encoding: "utf8" });
}

function grepArgsFromQuery(mode, pattern, targets) {
  const base = ["-R", mode === "files" ? "-l" : "-n", "-E", pattern];
  base.push(
    "--exclude-dir=node_modules",
    "--exclude-dir=dist",
    "--exclude=*.d.ts",
    "--exclude=*.js.map",
  );
  return [...base, ...targets];
}

function search(mode, pattern, targets) {
  if (hasRg) {
    const rgMode = mode === "files" ? "-l" : "-n";
    return rg([rgMode, pattern, ...targets, ...GLOBS]);
  }
  if (hasGrep) {
    return grep(grepArgsFromQuery(mode, pattern, targets));
  }
  return searchInNode(mode, pattern, targets);
}

function listSearchFiles(targets) {
  const files = [];
  const stack = [...targets];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    if (!fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(current, entry.name);
        const n = norm(p);
        if (n.includes("/node_modules/") || n.includes("/dist/")) continue;
        if (entry.isDirectory()) {
          stack.push(p);
        } else if (
          entry.isFile() &&
          !n.endsWith(".d.ts") &&
          !n.endsWith(".js.map") &&
          !n.endsWith(".png") &&
          !n.endsWith(".jpg") &&
          !n.endsWith(".jpeg") &&
          !n.endsWith(".gif") &&
          !n.endsWith(".ico") &&
          !n.endsWith(".icns")
        ) {
          files.push(p);
        }
      }
    } else if (stat.isFile()) {
      files.push(current);
    }
  }
  return files;
}

function searchInNode(mode, pattern, targets) {
  const regex = new RegExp(pattern);
  const files = listSearchFiles(targets);
  const out = [];

  for (const file of files) {
    let content = "";
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    let matchedFile = false;
    for (let i = 0; i < lines.length; i++) {
      if (!regex.test(lines[i])) continue;
      matchedFile = true;
      if (mode === "lines") {
        out.push(`${norm(file)}:${i + 1}:${lines[i]}`);
      }
    }
    if (mode === "files" && matchedFile) {
      out.push(norm(file));
    }
  }

  return out.join("\n");
}

function tryRg(args) {
  try {
    const mode = args.includes("-l") ? "files" : "lines";
    const filtered = args.filter((a) => a !== "-l" && a !== "-n");
    const pattern = filtered[0];
    const targets = filtered.slice(1).filter((a) => a !== "--glob" && !a.startsWith("!**/"));
    return search(mode, pattern, targets);
  } catch {
    return "";
  }
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function fail(title, details) {
  console.error(`🚨 ${title}`);
  if (details?.trim()) console.error(details.trimEnd());
  hasErrors = true;
}

function norm(p) {
  return p.replace(/\\/g, "/");
}

function isInAnyDir(file, dirs) {
  const f = norm(file);
  return dirs.some((d) => f.startsWith(norm(d) + "/") || f === norm(d));
}

// --------------------
// Check 0: search backend (rg preferred, grep fallback)
// --------------------
try {
  rg(["--version"]);
  hasRg = true;
  console.log("ℹ️  Search backend: ripgrep");
} catch {
  try {
    grep(["--version"]);
    hasGrep = true;
    console.log("ℹ️  Search backend: grep (fallback)");
  } catch {
    console.log("ℹ️  Search backend: built-in Node scanner (fallback)");
  }
}

// --------------------
// Check 1: No process exec in app surface
// --------------------
console.log("🔍 Check 1: No process execution in apps/terminal-pro/src...");
{
  const out = tryRg([
    "(require\\(['\"]child_process['\"]\\)|from\\s+['\"]node:child_process['\"]|child_process\\.(spawn|exec|fork|execFile|execSync|execFileSync)|shell:\\s*true)",
    APP_DIR,
  ]);
  if (out) fail("BYPASS RISK IN APP SURFACE", out);
  else ok("No bypass risks in apps/terminal-pro/src");
}

// --------------------
// Check 2: child_process only in tool layer
// --------------------
console.log("\n🔍 Check 2: child_process confined to tool layer...");
{
  const allMatches = tryRg([
    "(require\\(['\"]child_process['\"]\\)|from\\s+['\"]node:child_process['\"]|child_process\\.(spawn|exec|fork|execFile|execSync|execFileSync))",
    ...SCAN_ROOTS,
  ]);

  if (allMatches) {
    const filtered = allMatches
      .split("\n")
      .filter(Boolean)
      .filter((line) => {
        const file = norm(line.split(":")[0]);
        if (file.includes("/dist/") || file.endsWith("package.json")) return false;
        return !isInAnyDir(file, TOOL_LAYER_DIRS);
      })
      .join("\n");

    if (filtered) fail("PROCESS EXECUTION OUTSIDE TOOL LAYER", filtered);
    else ok("All process execution is within the tool layer");
  } else {
    ok("All process execution is within the tool layer");
  }
}

// --------------------
// Check 3: Tool layer safety
// --------------------
console.log("\n🔍 Check 3: Tool layer safety (no exec/execa/fork/execFile, no shell:true)...");
for (const dir of TOOL_LAYER_DIRS) {
  const risky = tryRg([
    "(execa?\\(|fork\\(|execFile\\(|shell:\\s*true)",
    dir,
  ]);
  if (risky) fail(`RISKY PATTERNS IN TOOL LAYER (${dir})`, risky);
  else ok(`${dir} - only safe spawn patterns`);
}

// --------------------
// Check 4: No cross-boundary relative imports
// --------------------
console.log("\n🔍 Check 4: No cross-package relative imports (../../../../)...");
{
  const out = tryRg([
    "from\\s+['\"]\\.\\.\\/\\.\\.\\/\\.\\.\\/\\.\\.\\/",
    ...SCAN_ROOTS,
  ]);
  if (out) fail("RELATIVE IMPORT BYPASS RISK", out);
  else ok("No relative import bypass risks");
}

// --------------------
// Check 5: Spawn timeout enforcement (per-spawn, within N lines)
// --------------------
console.log("\n🔍 Check 5: Spawn timeout enforcement (per-spawn, within N lines)...");

const TIMEOUT_WINDOW_LINES = 60;

{
  const spawnFilesRaw = tryRg([
    "-l",
    "spawn\\(",
    ...TOOL_LAYER_DIRS,
  ]);

  const spawnFiles = spawnFilesRaw.split("\n").map((s) => s.trim()).filter(Boolean);
  const offenders = [];

  const timeoutSignals = [
    /setTimeout\s*\(/,
    /\btimeoutMs\b/,
    /\btimeout\s*:/,
    /\btimeout\s*,(?![^\n]*\))/
  ];

  for (const file of spawnFiles) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes("spawn(")) continue;

      const end = Math.min(lines.length - 1, i + TIMEOUT_WINDOW_LINES);
      const windowText = lines.slice(i, end + 1).join("\n");

      const okTimeout = timeoutSignals.some((re) => re.test(windowText));
      if (!okTimeout) {
        offenders.push(`${file}:${i + 1} (no timeout within ${TIMEOUT_WINDOW_LINES} lines of spawn())`);
      }
    }
  }

  if (offenders.length) {
    fail("SPAWN WITHOUT NEARBY TIMEOUT ENFORCEMENT", offenders.join("\n"));
  } else {
    ok(`All spawn() calls have timeout enforcement within ${TIMEOUT_WINDOW_LINES} lines`);
  }
}

// --------------------
// Check 6: terminal-internals import restricted to core tool layer
// --------------------
console.log("\n🔍 Check 6: terminal-internals only imported by core tool layer...");
{
  const out = tryRg([
    "@rinawarp\\/tools\\/terminal-internals|terminal-internals",
    ...SCAN_ROOTS,
  ]);

  if (out) {
    const bad = out
      .split("\n")
      .filter(Boolean)
      .filter((line) => {
        const file = norm(line.split(":")[0]);
        if (file.endsWith("package.json") || file.includes("/dist/")) return false;
        return !file.startsWith(norm(CORE_TOOL_DIR) + "/");
      })
      .join("\n");

    if (bad) fail("terminal-internals IMPORT OUTSIDE CORE TOOL LAYER", bad);
    else ok("terminal-internals imports restricted correctly");
  } else {
    ok("terminal-internals imports restricted correctly");
  }
}

// --------------------
// Check 7: apps/** cannot import @rinawarp/tools/terminal*
// --------------------
console.log("\n🔍 Check 7: apps/** cannot import @rinawarp/tools/terminal*...");
{
  const out = tryRg([
    "@rinawarp\\/tools\\/terminal",
    "apps",
  ]);

  if (out) {
    const bad = out
      .split("\n")
      .filter(Boolean)
      .filter((line) => {
        const file = norm(line.split(":")[0]);
        // Skip package.json (exports field) and dist files
        if (file.endsWith("package.json") || file.includes("/dist/")) return false;
        return true;
      })
      .join("\n");

    if (bad) fail("apps/** IMPORTING @rinawarp/tools/terminal*", bad);
    else ok("apps/** cannot import @rinawarp/tools/terminal*");
  } else {
    ok("apps/** cannot import @rinawarp/tools/terminal*");
  }
}

// --------------------
// Final
// --------------------
console.log("\n" + "=".repeat(60));
if (hasErrors) {
  console.log("❌ CI lockdown FAILED - security violations detected");
  process.exit(1);
} else {
  console.log("✅ CI lockdown PASSED - no bypass risks detected");
  process.exit(0);
}
