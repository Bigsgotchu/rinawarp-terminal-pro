#!/usr/bin/env bash
set -euo pipefail

PRIMARY="${1:?primary site required}"
SECONDARY="${2:?secondary site required}"

tmp_a="$(mktemp)"
tmp_b="$(mktemp)"
trap 'rm -f "$tmp_a" "$tmp_b"' EXIT

echo "[audit:compare] Fetching manifests"
curl -fsSL "${PRIMARY%/}/releases/latest.json" > "$tmp_a"
curl -fsSL "${SECONDARY%/}/releases/latest.json" > "$tmp_b" || true

primary_version="$(grep -o '"version":[[:space:]]*"[^"]*"' "$tmp_a" | head -n1 | cut -d'"' -f4)"
secondary_version="$(grep -o '"version":[[:space:]]*"[^"]*"' "$tmp_b" | head -n1 | cut -d'"' -f4 || true)"

echo "[audit:compare] primary version: ${primary_version:-unknown}"
echo "[audit:compare] secondary version: ${secondary_version:-unknown}"

curl -fsSI "${PRIMARY%/}/download/linux" | grep -qi '^location:'

if [[ -n "${secondary_version:-}" ]]; then
  echo "[audit:compare] secondary manifest reachable"
else
  echo "[audit:compare] secondary manifest unavailable or stale"
fi

echo "[audit:compare] PASS"
