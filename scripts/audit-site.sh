#!/usr/bin/env bash
set -euo pipefail

SITE_BASE="${1:?site base required}"
PAGES_BASE="${2:?pages base required}"
CHECKSUM_URL="${3:?checksum url required}"

tmp_manifest="$(mktemp)"
trap 'rm -f "$tmp_manifest"' EXIT

echo "[audit:site] Checking site health"
curl -fsSL "${SITE_BASE%/}/releases/latest.json" > "$tmp_manifest"
grep -q '"version"' "$tmp_manifest"
grep -q '"downloadUrl"\|"files"' "$tmp_manifest"

echo "[audit:site] Checking download redirect"
curl -fsSI "${SITE_BASE%/}/download/linux" | grep -qi '^location:'

echo "[audit:site] Checking Pages domain responds"
curl -fsSI "${PAGES_BASE%/}/" >/dev/null

echo "[audit:site] Checking checksum surface"
curl -fsSI "$CHECKSUM_URL" >/dev/null

echo "[audit:site] PASS"
