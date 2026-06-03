#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const expectedRemote = 'Bigsgotchu/rinawarp-terminal-pro';
const expectedBranch = 'main';
const expectedVersion = '1.8.2-beta';
const requiredFiles = [
  '.gitignore',
  'docs/PRODUCTION_STATE.md',
  'scripts/founder/clean-local.mjs'
];

function runGit(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

try {
  const remote = runGit('git remote -v');
  if (!remote.includes(expectedRemote)) {
    fail(`git remote does not include '${expectedRemote}'.\n${remote}`);
  }
} catch (error) {
  fail('Unable to read git remotes. Are you in the repository root?');
}

let branch;
try {
  branch = runGit('git branch --show-current');
  if (branch !== expectedBranch) {
    fail(`git branch is '${branch}', expected '${expectedBranch}'.`);
  }
} catch (error) {
  fail('Unable to read git branch.');
}

const terminalProPackagePath = path.resolve(root, 'apps/terminal-pro/package.json');
if (!fs.existsSync(terminalProPackagePath)) {
  fail(`Missing required file: ${path.relative(root, terminalProPackagePath)}`);
}

let version;
try {
  const terminalProPackage = JSON.parse(fs.readFileSync(terminalProPackagePath, 'utf8'));
  version = terminalProPackage.version;
  if (version !== expectedVersion) {
    fail(`apps/terminal-pro/package.json version is '${version}', expected '${expectedVersion}'.`);
  }
} catch (error) {
  fail(`Unable to read or parse ${path.relative(root, terminalProPackagePath)}.`);
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required canonical file: ${relativePath}`);
  }
}

console.log('Repository identity check passed.');
console.log(`Repository: ${expectedRemote}`);
console.log(`Branch: ${branch}`);
console.log(`Terminal Pro version: ${version}`);
console.log('Required canonical files are present.');
