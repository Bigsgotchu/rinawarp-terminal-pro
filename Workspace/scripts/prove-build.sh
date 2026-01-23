#!/usr/bin/env bash
set -euo pipefail

echo "=== PROVE BUILD ==="
echo "[cwd] $(pwd)"

# Must be in a git repo
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
echo "[repo] $ROOT"

echo ""
echo "== Toolchain =="
command -v node >/dev/null && node -v
command -v pnpm >/dev/null && pnpm -v

echo ""
echo "== Install (workspace) =="
pnpm -w install

echo ""
echo "== Workspace packages =="
pnpm -w list --depth -1 || true

echo ""
echo "== Build (only where build script exists) =="
pnpm -w -r run build --if-present

echo ""
echo "== Test (only where test script exists) =="
pnpm -w -r run test --if-present

echo ""
echo "✅ PROVE BUILD PASSED"
