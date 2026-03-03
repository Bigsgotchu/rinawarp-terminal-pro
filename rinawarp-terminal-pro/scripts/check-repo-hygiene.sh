#!/usr/bin/env bash
set -euo pipefail

fail=0

is_allowed() {
  local needle="$1"
  shift
  for x in "$@"; do
    if [[ "$x" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

declare -a allowed_themes=(
  "apps/terminal-pro/themes/themes.json"
  "apps/terminal-pro/dist-electron/themes/themes.json"
)

mapfile -t found_themes < <(find . -type f -path "*/themes/themes.json" \
  -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | sed 's#^\./##' | sort)
for p in "${found_themes[@]}"; do
  if ! is_allowed "$p" "${allowed_themes[@]}"; then
    echo "[hygiene] unexpected themes registry path: $p"
    fail=1
  fi
done

declare -a allowed_policy=(
  "policy/rinawarp-policy.yaml"
  "apps/terminal-pro/dist-electron/policy/rinawarp-policy.yaml"
)

mapfile -t found_policy < <(find . -type f -name "rinawarp-policy.yaml" \
  -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | sed 's#^\./##' | sort)
for p in "${found_policy[@]}"; do
  if ! is_allowed "$p" "${allowed_policy[@]}"; then
    echo "[hygiene] unexpected policy path: $p"
    fail=1
  fi
done

if [[ -f "rinawarp-policy.yaml" ]]; then
  echo "[hygiene] unexpected root-level policy file (CWD load risk): rinawarp-policy.yaml"
  fail=1
fi

mapfile -t root_dist_dirs < <(find . -maxdepth 1 -mindepth 1 -type d \( -name "dist" -o -name "dist-electron" -o -name "out" \) \
  2>/dev/null | sed 's#^\./##' | sort)
if [[ "${#root_dist_dirs[@]}" -gt 1 ]]; then
  echo "[hygiene] multiple root-level dist directories found: ${root_dist_dirs[*]}"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "Repo hygiene check passed."
