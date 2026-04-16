#!/bin/bash

# RinaWarp Security Audit Script
# Checks for vulnerable packages in dependencies

set -e

echo "============================================"
echo "🔐 RinaWarp Security Audit"
echo "============================================"
echo ""

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm not found. Please install pnpm first."
  exit 1
fi

# Run security audit
echo "Running dependency security scan..."
echo ""

# Generate audit report
pnpm audit --json > security-report.json 2>&1 || true

# Check for vulnerabilities
VULNS=$(grep -c '"vulnerabilities"' security-report.json 2>/dev/null || echo "0")

if [ "$VULNS" -gt "0" ]; then
  echo "⚠️  Security vulnerabilities found!"
  echo ""
  echo "Summary:"
  pnpm audit 2>/dev/null || true
  echo ""
  echo "Full report saved to: security-report.json"
  echo ""
  echo "To fix automatically (may require review):"
  echo "  pnpm audit --fix"
  echo ""
  exit 1
else
  echo "✅ No security vulnerabilities found!"
  rm -f security-report.json
  exit 0
fi