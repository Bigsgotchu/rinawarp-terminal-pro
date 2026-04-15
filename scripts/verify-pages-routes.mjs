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

expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/v1/*"', "Website API v1 route");
expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/releases/*"', "Website releases route");
expectIncludes(websiteConfig, 'pattern = "rinawarptech.com/agents"', "Website agents route");
expectIncludes(websiteConfig, 'binding = "RINAWARP_CDN"', "Website R2 binding");

if (
  rootConfig.includes('pattern = "rinawarptech.com/v1/*"') ||
  rootConfig.includes('pattern = "rinawarptech.com/releases/*"') ||
  rootConfig.includes('pattern = "rinawarptech.com/agents"')
) {
  throw new Error("Root downloads worker still owns routes now expected on website worker");
}

console.log("Website worker route ownership OK.");
