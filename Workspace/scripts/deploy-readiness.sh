#!/usr/bin/env bash
set -euo pipefail
echo "=== DEPLOY READINESS ==="

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
echo "[repo] $ROOT"

echo ""
echo "== Required files check =="
for p in "pnpm-workspace.yaml" "package.json"; do
  test -f "$p" && echo "✅ $p" || (echo "❌ missing $p" && exit 1)
done

echo ""
echo "== Env hints (API deployments) =="
echo "- MONGODB_URI"
echo "- JWT_SECRET"
echo "- STRIPE_SECRET_KEY"
echo "- STRIPE_WEBHOOK_SECRET"

echo ""
echo "✅ DEPLOY READINESS OK"
