#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const websiteConfigPath = path.join(repoRoot, "website", "wrangler.toml");
const rootConfigPath = path.join(repoRoot, "wrangler.toml");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function expectIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const websiteConfig = read(websiteConfigPath);
const rootConfig = read(rootConfigPath);

expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/download"', "Pages exact download route");
expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/download/"', "Pages slash download route");
expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/download/*"', "Pages download route");
expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/releases/*"', "Pages releases route");
expectIncludes(websiteConfig, 'binding = "RINAWARP_CDN"', "Pages R2 binding");

if (
  rootConfig.includes('pattern = "rinawarptech.com/download"') ||
  rootConfig.includes('pattern = "rinawarptech.com/download/"') ||
  rootConfig.includes('pattern = "rinawarptech.com/download/*"') ||
  rootConfig.includes('pattern = "rinawarptech.com/releases/*"')
) {
  throw new Error("Root downloads worker still owns apex download/release routes");
}

console.log("Pages route ownership OK.");
