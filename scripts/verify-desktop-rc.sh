#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify:desktop:rc] Auditing production runtime paths for runtime integrity"
npm run guard:no-stubs

echo "[verify:desktop:rc] Auditing production runtime paths for fake-success patterns"
npm run guard:no-fake-success

echo "[verify:desktop:rc] Enforcing intent contracts"
npm run guard:intent-contracts

echo "[verify:desktop:rc] Enforcing single-owner event and view ownership"
npm run guard:single-owner-events

echo "[verify:desktop:rc] Running first-run and workspace acceptance"
npm --workspace apps/terminal-pro run test:e2e:first-run

echo "[verify:desktop:rc] Running conversation acceptance"
npm --workspace apps/terminal-pro run test:e2e:conversation

echo "[verify:desktop:rc] Running proof and workflow acceptance"
npm --workspace apps/terminal-pro run test:e2e:proof

echo "[verify:desktop:rc] Running packaged first-run acceptance"
npm --workspace apps/terminal-pro run test:e2e:packaged-first-run

echo "[verify:desktop:rc] Running VS Code Companion validation"
npm run test:companion

echo "[verify:desktop:rc] Building desktop app"
npm --workspace apps/terminal-pro run build:electron

echo "[verify:desktop:rc] PASS"
