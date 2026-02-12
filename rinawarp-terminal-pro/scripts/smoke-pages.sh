#!/usr/bin/env bash
set -euo pipefail

WWW="${1:-https://www.rinawarptech.com}"
PAGES="${2:-https://rinawarptech-website.pages.dev}"

echo "== Checking build fingerprints =="
WWW_B="$(curl -fsS "$WWW/_build.txt" || true)"
PAGES_B="$(curl -fsS "$PAGES/_build.txt" || true)"

echo "WWW  : $WWW_B"
echo "PAGES: $PAGES_B"
echo

echo "== Checking key routes =="
for p in / /download/ /login/ /signup/ /account/ /qzje/ ; do
  w="$(curl -sI "$WWW$p" | head -1)"
  d="$(curl -sI "$PAGES$p" | head -1)"
  printf "%-10s  WWW: %-20s  PAGES: %-20s\n" "$p" "$w" "$d"
done

echo
if [[ "$WWW_B" != "$PAGES_B" ]]; then
  echo "❌ MISMATCH: www and pages.dev are serving different deployments."
  exit 1
fi

echo "✅ MATCH: fingerprints equal"
