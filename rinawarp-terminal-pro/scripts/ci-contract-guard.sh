#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT/docs"
INDEX_FILE="$DOCS_DIR/RINA_CONTRACT_INDEX.md"
RG_BASE=(rg --files --glob '!data/db/**' --glob '!**/node_modules/**' --glob '!**/dist/**')

list_files() {
  "${RG_BASE[@]}" "$@" 2>/dev/null || true
}

required=(
  "RINA_PRODUCT_CONTRACT.md"
  "RINA_SAFETY_MODEL.md"
  "RINA_PERSONALITY_CONTRACT.md"
  "RINA_TOOL_REGISTRY_V1.md"
  "RINA_LICENSE_GATING_V1.md"
  "RINA_PLAYBOOKS.md"
  "RINA_90_DAY_PLAN.md"
  "RINA_CONTRACT_INDEX.md"
)

echo "== Rina Contract Guard =="
echo "root: $ROOT"

if [[ ! -d "$DOCS_DIR" ]]; then
  echo "❌ Missing docs directory: $DOCS_DIR"
  exit 1
fi

if [[ ! -f "$INDEX_FILE" ]]; then
  echo "❌ Missing contract index: $INDEX_FILE"
  exit 1
fi

echo "== Checking required contract files in docs/ =="
for f in "${required[@]}"; do
  if [[ ! -f "$DOCS_DIR/$f" ]]; then
    echo "❌ Missing required contract file: docs/$f"
    exit 1
  fi
  echo "✅ docs/$f"
done

echo "== Checking index references =="
for f in "${required[@]}"; do
  if ! rg -q "docs/$f" "$INDEX_FILE"; then
    echo "❌ Index missing reference to docs/$f"
    exit 1
  fi
  echo "✅ indexed: docs/$f"
done

echo "== Checking for canonical contract filenames outside docs/ =="
mapfile -t external < <(cd "$ROOT" && {
  for f in "${required[@]}"; do
    list_files -g "**/$f" | rg -v '^docs/' || true
  done
})

if (( ${#external[@]} > 0 )); then
  echo "❌ Found canonical contract filename(s) outside docs/:"
  for p in "${external[@]}"; do
    echo "  - ${p#$ROOT/}"
  done
  exit 1
fi
echo "✅ No canonical contract filename duplicates outside docs/"

echo "== Checking canonical docs filenames are unique =="
for f in "${required[@]}"; do
  count="$(cd "$ROOT" && list_files -g "**/$f" | wc -l | tr -d ' ')"
  if [[ "$count" != "1" ]]; then
    echo "❌ Expected exactly 1 copy of $f across repo, found $count"
    exit 1
  fi
  echo "✅ unique: $f"
done

echo "✅ Contract guard passed"
