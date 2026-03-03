#!/usr/bin/env node
/**
 * ESLint Warning Budget Script
 * Fails CI if warning count exceeds budget threshold
 * Usage: node scripts/eslint-warning-budget.js --max <count> <eslint-json-file>
 */

const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  let maxWarnings = 5; // Default budget
  let jsonFile = null;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--max" && i + 1 < args.length) {
      maxWarnings = parseInt(args[i + 1], 10);
      i += 1;
    } else if (!args[i].startsWith("--")) {
      jsonFile = args[i];
    }
  }

  return { maxWarnings, jsonFile };
}

function countWarnings(data) {
  let total = 0;
  for (const file of data) {
    for (const msg of file.messages || []) {
      if (msg.severity === 1) total += 1;
    }
  }
  return total;
}

function main() {
  const { maxWarnings, jsonFile } = parseArgs();

  if (!jsonFile) {
    console.error("Usage: node eslint-warning-budget.js --max <count> <eslint-json-file>");
    process.exit(1);
  }

  const filePath = path.resolve(jsonFile);
  if (!fs.existsSync(filePath)) {
    console.error(`ESLint JSON file not found: ${filePath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`Failed to parse ESLint JSON: ${e.message}`);
    process.exit(1);
  }

  const warningCount = countWarnings(data);
  const status = warningCount <= maxWarnings ? "PASS" : "FAIL";
  const delta = warningCount - maxWarnings;

  console.log(`ESLint Warning Budget: ${maxWarnings}`);
  console.log(`Current Warnings: ${warningCount}`);
  console.log(`Status: ${status}`);

  if (delta > 0) {
    console.log(`\n❌ Budget exceeded by ${delta} warning(s)`);
    console.log("Please fix the warnings or adjust the budget threshold.");
    process.exit(1);
  } else if (delta < 0) {
    console.log(`\n✅ Budget has room for ${Math.abs(delta)} more warning(s)`);
    console.log("Consider lowering the budget threshold to maintain quality.");
  } else {
    console.log("\n✅ Budget exactly met");
  }

  process.exit(0);
}

main();
