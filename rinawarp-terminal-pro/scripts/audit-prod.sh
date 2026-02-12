#!/usr/bin/env bash
set -euo pipefail

WWW="${1:-https://www.rinawarptech.com}"
PAGES="${2:-https://rinawarptech-website.pages.dev}"

paths=(
  "/"
  "/download/"
  "/login/"
  "/signup/"
  "/account/"
  "/qzje/"
  "/_build.txt"
)

echo "== Comparing WWW vs Pages for key routes =="
echo "WWW  : $WWW"
echo "PAGES: $PAGES"
echo

FAILED=0

for p in "${paths[@]}"; do
  w_code="$(curl -s -o /dev/null -w "%{http_code}" "$WWW$p")"
  p_code="$(curl -s -o /dev/null -w "%{http_code}" "$PAGES$p")"
  
  echo "$p"
  echo "  WWW  -> $w_code"
  echo "  PAGES -> $p_code"

  if [[ "$w_code" != "$p_code" ]]; then
    echo "  ⚠️  MISMATCH DETECTED"
    FAILED=1
  fi

  # show identifying headers
  echo "  WWW headers:"
  w_headers="$(curl -sI "$WWW$p" | egrep -i '^(cf-ray|server|cf-cache-status|location|x-content-type-options|content-security-policy)' | sed 's/^/    /')"
  if [[ -n "$w_headers" ]]; then
    echo "$w_headers"
  else
    echo "    (no identifying headers)"
  fi
  
  echo "  PAGES headers:"
  p_headers="$(curl -sI "$PAGES$p" | egrep -i '^(cf-ray|server|cf-cache-status|location|x-content-type-options|content-security-policy)' | sed 's/^/    /')"
  if [[ -n "$p_headers" ]]; then
    echo "$p_headers"
  else
    echo "    (no identifying headers)"
  fi
  echo
done

echo
if [[ "$FAILED" == "1" ]]; then
  echo "❌ FAIL: Route mismatches detected"
  exit 1
else
  echo "✅ PASS: All routes match between WWW and PAGES"
  exit 0
fi
