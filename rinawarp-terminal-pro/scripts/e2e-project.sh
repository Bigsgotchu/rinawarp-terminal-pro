#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== E2E Project (Full Stack) =="
echo "Root: $ROOT"
echo

run_step() {
  local name="$1"
  shift
  echo "== $name =="
  "$@"
  echo
}

run_step "1) Local site routing integrity" npm run verify:site
run_step "2) Download link integrity" npm run verify:downloads
run_step "3) Build fingerprint parity (www vs pages.dev)" npm run smoke:pages
run_step "4) Production route + API smoke" npm run smoke:prod
run_step "5) Production audit (routes + manifest + checksums)" npm run audit:prod
run_step "6) Stripe API smoke" npm run smoke:stripe
run_step "7) Revenue funnel E2E" npm run e2e:revenue
run_step "8) Auth local password E2E" npm run e2e:auth-local

echo "✅ PASS: full project E2E completed"
