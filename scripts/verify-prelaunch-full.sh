#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify:prelaunch:full] Building desktop app"
npm --prefix apps/terminal-pro run build:electron

echo "[verify:prelaunch:full] Running proof suite"
npm --prefix apps/terminal-pro run test:e2e:proof

echo "[verify:prelaunch:full] Running Stripe smoke"
npm run smoke:stripe

echo "[verify:prelaunch:full] Auditing Stripe success path"
npm run audit:stripe-success

echo "[verify:prelaunch:full] Running revenue E2E"
npm run e2e:revenue

echo "[verify:prelaunch:full] Building local release artifacts"
npm run release:desktop

echo "[verify:prelaunch:full] PASS"
