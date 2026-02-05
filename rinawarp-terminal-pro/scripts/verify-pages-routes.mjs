#!/usr/bin/env node
/**
 * Verifies Cloudflare Pages static routes exist.
 * Fails CI if any required route directory is missing index.html.
 *
 * Usage:
 *   node scripts/verify-pages-routes.mjs apps/marketing-web
 */

import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("apps/marketing-web");

const REQUIRED_ROUTES = [
  "login",
  "signup",
  "account",
  "download",
  "qzje",
];

const REQUIRED_FILES = [
  "_redirects",
];

function existsFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

console.log(`🔎 Verifying marketing site routes in: ${root}`);

if (!existsDir(root)) {
  console.error(`❌ Not a directory: ${root}`);
  process.exit(1);
}

for (const f of REQUIRED_FILES) {
  const fp = path.join(root, f);
  if (!existsFile(fp)) fail(`Missing required file: ${fp}`);
  else console.log(`✅ Found: ${f}`);
}

for (const r of REQUIRED_ROUTES) {
  const dir = path.join(root, r);
  const index = path.join(dir, "index.html");
  const altFile = path.join(root, `${r}.html`);

  // Special case: /download/ is handled by redirect from download.html
  if (r === "download") {
    if (existsFile(altFile)) {
      console.log(`✅ Route OK: /${r}/ (via redirect from ${r}.html)`);
      continue;
    }
  }

  if (!existsDir(dir)) {
    fail(`Missing route directory: ${dir} (would break /${r}/)`);
    continue;
  }

  if (!existsFile(index)) {
    fail(`Missing ${index} (would break /${r}/)`);
    continue;
  }

  console.log(`✅ Route OK: /${r}/`);
}

if (process.exitCode) {
  console.error("\n🚨 Route verification FAILED. Fix missing files before deploy.");
  process.exit(1);
}

console.log("\n✅ Route verification PASSED.");
