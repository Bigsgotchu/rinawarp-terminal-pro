#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function run(command, options = {}) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()
}

function fail(message) {
  console.error(`[founder:check-repo] ${message}`)
  process.exit(1)
}

let repoRoot
try {
  repoRoot = run('git rev-parse --show-toplevel')
} catch {
  fail('Unable to locate git repository root. Are you inside the canonical repo?')
}

process.chdir(repoRoot)

let remote
try {
  remote = run('git remote -v')
} catch {
  fail('Unable to read git remotes.')
}

let branch
try {
  branch = run('git branch --show-current')
} catch {
  fail('Unable to read current git branch.')
}

const packagePath = path.join(repoRoot, 'apps/terminal-pro/package.json')

if (!fs.existsSync(packagePath)) {
  fail('Missing apps/terminal-pro/package.json')
}

const terminalPro = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

const errors = []

if (repoRoot !== '/home/karina/rinawarp-terminal-pro') {
  errors.push(`Expected repo root /home/karina/rinawarp-terminal-pro, got ${repoRoot}`)
}

if (!remote.includes('Bigsgotchu/rinawarp-terminal-pro')) {
  errors.push('Remote does not point to Bigsgotchu/rinawarp-terminal-pro')
}

if (branch !== 'main') {
  errors.push(`Expected branch main, got ${branch}`)
}

if (terminalPro.version !== '1.8.2-beta') {
  errors.push(`Expected version 1.8.2-beta, got ${terminalPro.version}`)
}

const requiredFiles = [
  'docs/PRODUCT_LOCK.md',
  'docs/STARTUP_CHECKLIST.md',
  'docs/PRODUCTION_STATE.md',
  'apps/terminal-pro/src/renderer/index.html',
  'apps/terminal-pro/src/renderer/index.ts',
  'apps/terminal-pro/src/renderer/bootstrap/initRenderer.ts',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    errors.push(`Missing required file: ${file}`)
  }
}

if (errors.length) {
  console.error('[founder:check-repo] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('[founder:check-repo] OK')
console.log('Repository: Bigsgotchu/rinawarp-terminal-pro')
console.log(`Path: ${repoRoot}`)
console.log(`Branch: ${branch}`)
console.log(`Terminal Pro version: ${terminalPro.version}`)
