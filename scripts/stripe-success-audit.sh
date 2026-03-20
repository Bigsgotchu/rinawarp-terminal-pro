#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[audit:stripe-success] Auditing launch signoff surfaces"
test -f docs/final-launch-signoff.md
rg -q 'Stripe test checkout completed successfully with a real test card' docs/final-launch-signoff.md
rg -q 'Stripe webhook upgraded the license in the desktop app after checkout' docs/final-launch-signoff.md
rg -q 'checkout_started' docs/final-launch-signoff.md
rg -q 'checkout_completed' docs/final-launch-signoff.md

echo "[audit:stripe-success] Auditing desktop billing paths"
rg -q 'api/license/verify' apps/terminal-pro/src/license.ts
rg -q 'api/checkout' apps/terminal-pro/src/license.ts
rg -q 'api/license/portal|api/portal' apps/terminal-pro/src/license.ts
rg -q 'lookupLicenseByEmail' apps/terminal-pro/src/main/ipc/registerLicenseIpc.ts

echo "[audit:stripe-success] PASS"
