import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

mkdirSync(distDir, { recursive: true });

// naive CJS wrapper so consumers using require() work
const esmPath = path.join(distDir, "index.js");
const cjsPath = path.join(distDir, "index.cjs");

const esm = readFileSync(esmPath, "utf8");

// This keeps things simple for Electron/CommonJS importers.
const cjs = `
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

let mod;
async function load() {
  if (!mod) mod = await import("./index.js");
  return mod;
}

exports.createApiClient = (...args) => load().then(m => m.createApiClient(...args));
exports.APIError = (...args) => load().then(m => m.APIError(...args));
`;

writeFileSync(cjsPath, cjs.trimStart(), "utf8");
console.log("✅ emitted dist/index.cjs");
