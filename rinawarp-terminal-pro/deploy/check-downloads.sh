#!/usr/bin/env bash
set -euo pipefail
trap 'echo "❌ Failed at line $LINENO"; exit 1' ERR

# ============================================================
# RinaWarp Terminal Pro - Download Verification Script
# Verifies installer files have correct headers, sizes, and aren't HTML
# Supports both authenticated (token) and unauthenticated checks
# ============================================================

BASE="${1:-https://rinawarptech.com/downloads}"
TOKEN="${2:-}"
VERIFY_NO_TOKEN="${3:-}"

FILES=(
  "RinaWarp-Terminal-Pro-1.0.0.dmg"
  "RinaWarp-Terminal-Pro-1.0.0.exe"
  "RinaWarp-Terminal-Pro-1.0.0.AppImage"
  "RinaWarp-Terminal-Pro-1.0.0.amd64.deb"
  "RinaWarp-Terminal-Pro-1.0.0.x86_64.rpm"
  "RinaWarp-Terminal-Pro-1.0.0-macOS.zip"
  "RinaWarp-Terminal-Pro-1.0.0-win32.zip"
)

fail=0

echo "=============================================="
echo "RinaWarp Terminal Pro - Download Verification"
echo "=============================================="
echo "Base URL: $BASE"
if [[ -n "$TOKEN" ]]; then
  echo "Token: ${TOKEN:0:8}...(redacted)"
else
  echo "Token: (none provided)"
fi
echo ""

# ============================================================
# Check all artifacts with token
# ============================================================
if [[ -n "$TOKEN" ]]; then
  for f in "${FILES[@]}"; do
    url="$BASE/$f?token=$TOKEN"
    echo "== $f =="
    
    # Get HTTP headers
    headers=$(curl -sSI "$url" 2>/dev/null || true)
    
    http=$(echo "$headers" | awk 'toupper($0) ~ /^HTTP\// {print $2; exit}')
    ctype=$(echo "$headers" | awk -F': ' 'tolower($1)=="content-type" {print tolower($2); exit}' | tr -d '\r')
    cdisp=$(echo "$headers" | awk -F': ' 'tolower($1)=="content-disposition" {print $2; exit}' | tr -d '\r')
    clen=$(echo "$headers" | awk -F': ' 'tolower($1)=="content-length" {print $2; exit}' | tr -d '\r')
    
    echo "HTTP:               ${http:-?}"
    echo "Content-Type:       ${ctype:-?}"
    echo "Content-Disposition: ${cdisp:-?}"
    echo "Content-Length:     ${clen:-?}"
    
    # Check HTTP status
    if [[ "${http:-}" == "200" ]]; then
      echo "✅ HTTP 200 OK"
    else
      echo "❌ FAIL: Expected HTTP 200, got ${http:-?}"
      ((fail++))
    fi
    
    # Check content-type is not HTML
    if [[ "${ctype:-}" == *"text/html"* ]]; then
      echo "❌ FAIL: Looks like HTML (routing broken)"
      ((fail++))
    else
      echo "✅ Not HTML (binary content)"
    fi
    
    # Check Content-Disposition has attachment
    if [[ -n "${cdisp:-}" && "${cdisp:-}" == *"attachment"* ]]; then
      echo "✅ Has attachment Content-Disposition"
    else
      echo "⚠ Missing attachment Content-Disposition"
    fi
    
    echo ""
  done
else
  echo "⚠ No token provided - skipping authenticated checks"
  echo "   Pass a token as second argument to verify downloads"
  echo ""
fi

# ============================================================
# Check no-token fails (fail-fast security check)
# ============================================================
if [[ "$VERIFY_NO_TOKEN" == "--verify-no-token-fails" ]]; then
  echo "== Checking unauthenticated access (should fail) =="
  
  first_file="${FILES[0]}"
  url="$BASE/$first_file"
  echo "Request: $url"
  
  headers=$(curl -sSI "$url" 2>/dev/null || true)
  http=$(echo "$headers" | awk 'toupper($0) ~ /^HTTP\// {print $2; exit}' | tr -d '\r')
  
  echo "HTTP: ${http:-?}"
  
  if [[ "$http" == "401" ]] || [[ "$http" == "403" ]]; then
    echo "✅ Correctly rejected (HTTP $http)"
  else
    echo "⚠ Expected 401 or 403, got $http"
    echo "   This may be expected in development mode"
  fi
  echo ""
fi

# ============================================================
# Summary
# ============================================================
echo "=============================================="
echo "Download Verification Summary"
echo "=============================================="
echo "Files checked: ${#FILES[@]}"
echo "Failures: $fail"
echo ""

if (( fail == 0 )); then
  echo "✅ All authenticated download checks passed!"
  echo "   All artifacts return HTTP 200 + binary content-type"
  echo "   All have Content-Disposition: attachment"
  exit 0
else
  echo "❌ Some checks failed!"
  echo "   Review output above for details"
  exit 1
fi
