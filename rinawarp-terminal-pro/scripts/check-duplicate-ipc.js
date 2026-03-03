#!/usr/bin/env node
/**
 * check-duplicate-ipc.js
 *
 * Scans all source files for ipcMain.handle() calls and detects
 * duplicate channel registrations. Fails if the same channel is
 * registered more than once.
 *
 * Usage: node scripts/check-duplicate-ipc.js
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetDir = path.join(root, "apps", "terminal-pro", "src");

/**
 * Recursively walk directory and collect all source files
 * @param {string} dir
 * @param {string[]} out
 * @returns {string[]}
 */
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist-electron" || ent.name === "dist") continue;
      walk(p, out);
    } else if (ent.isFile()) {
      if (p.endsWith(".ts") || p.endsWith(".js") || p.endsWith(".cjs") || p.endsWith(".mjs")) out.push(p);
    }
  }
  return out;
}

const files = walk(targetDir);

// Match ipcMain.handle("channel") and ipcMain.handle(`channel`)
const handleRe = /ipcMain\.handle\(\s*["'`]([^"'`]+)["'`]/g;

// Also match ipcMain.on("channel") for completeness
const onRe = /ipcMain\.on\(\s*["'`]([^"'`]+)["'`]/g;

/** @type {Map<string, {type: string, locations: {file: string, line: number}[]}>} */
const channels = new Map();

/**
 * @param {string} type
 * @param {string} channel
 * @param {string} file
 * @param {number} line
 */
function record(type, channel, file, line) {
  const key = `${type}:${channel}`;
  const entry = channels.get(key) || { type, channel, locations: [] };
  entry.locations.push({ file: path.relative(root, file), line });
  channels.set(key, entry);
}

for (const file of files) {
  const txt = fs.readFileSync(file, "utf8");

  // Find all ipcMain.handle() calls
  let m;
  while ((m = handleRe.exec(txt))) {
    const channel = m[1];
    const before = txt.slice(0, m.index);
    const line = before.split("\n").length;
    record("handle", channel, file, line);
  }

  // Find all ipcMain.on() calls
  while ((m = onRe.exec(txt))) {
    const channel = m[1];
    const before = txt.slice(0, m.index);
    const line = before.split("\n").length;
    record("on", channel, file, line);
  }
}

// Find duplicates
const dups = [...channels.values()].filter((e) => e.locations.length > 1);

if (dups.length) {
  console.error("\n❌ Duplicate IPC channel registrations found:\n");
  for (const dup of dups) {
    console.error(`  ${dup.type}("${dup.channel}") registered ${dup.locations.length} times:`);
    for (const loc of dup.locations) {
      console.error(`    - ${loc.file}:${loc.line}`);
    }
    console.error("");
  }
  console.error("Move duplicate handlers into src/main/** modules and register via registerAllIpc().");
  process.exit(1);
}

// Summary
const handleCount = [...channels.values()].filter((e) => e.type === "handle").length;
const onCount = [...channels.values()].filter((e) => e.type === "on").length;
console.log(`✅ No duplicate IPC channels found (${handleCount} handle, ${onCount} on).`);
