#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/rinawarptech-website/web"
TERMINAL_RENDERER="$ROOT/apps/terminal-pro/src/renderer.html"

RINAWARP_LOGO="/assets/img/rinawarp-logo.png"
UNICORN_LOGO="/assets/img/rina-unicorn-logo.png"

fail() {
  echo "❌ $1"
  exit 1
}

check_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if ! rg -q --fixed-strings -- "$pattern" "$file"; then
    fail "$label missing in ${file#$ROOT/}: $pattern"
  fi
}

check_not_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if rg -q --fixed-strings -- "$pattern" "$file"; then
    fail "$label unexpectedly found in ${file#$ROOT/}: $pattern"
  fi
}

echo "== Branding Guard =="
echo "root: $ROOT"

[[ -f "$WEB/assets/img/rinawarp-logo.png" ]] || fail "Missing $WEB/assets/img/rinawarp-logo.png"
[[ -f "$WEB/assets/img/rina-unicorn-logo.png" ]] || fail "Missing $WEB/assets/img/rina-unicorn-logo.png"

terminal_pages=(
  "$WEB/index.html"
  "$WEB/download.html"
  "$WEB/features.html"
  "$WEB/pricing.html"
  "$WEB/about.html"
  "$WEB/contact.html"
  "$WEB/account/index.html"
  "$WEB/login/index.html"
  "$WEB/signup/index.html"
  "$WEB/terminal-pro.html"
)

music_pages=(
  "$WEB/music-video-creator.html"
  "$WEB/rina-vex.html"
  "$WEB/rina-vex-music.html"
)

echo "== Checking terminal/core pages use RinaWarp logo =="
for f in "${terminal_pages[@]}"; do
  [[ -f "$f" ]] || fail "Missing page: ${f#$ROOT/}"
  check_contains "$f" "$RINAWARP_LOGO" "RinaWarp logo"
  check_not_contains "$f" "$UNICORN_LOGO" "Unicorn logo"
  echo "✅ ${f#$ROOT/}"
done

echo "== Checking music pages use unicorn logo =="
for f in "${music_pages[@]}"; do
  [[ -f "$f" ]] || fail "Missing page: ${f#$ROOT/}"
  check_contains "$f" "$UNICORN_LOGO" "Unicorn logo"
  check_not_contains "$f" "$RINAWARP_LOGO" "RinaWarp logo"
  echo "✅ ${f#$ROOT/}"
done

echo "== Checking theme contracts =="
check_contains "$WEB/terminal-pro.html" "class=\"mermaid-theme\"" "Terminal mermaid theme class"
check_contains "$WEB/terminal-pro.html" "--mermaid-primary: #FF1B8D;" "Terminal mermaid primary"
check_contains "$WEB/music-video-creator.html" "class=\"unicorn-theme\"" "Music unicorn theme class"
check_contains "$WEB/music-video-creator.html" "--unicorn-primary: #ff0f8a;" "Music unicorn primary"
check_contains "$WEB/music-video-creator.html" "--unicorn-secondary: #7a3bff;" "Music unicorn secondary"
check_contains "$WEB/music-video-creator.html" "--unicorn-accent: #00d7ff;" "Music unicorn accent"
check_contains "$WEB/music-video-creator.html" "--unicorn-bg: #04050a;" "Music unicorn background"

echo "== Checking desktop terminal app branding =="
[[ -f "$TERMINAL_RENDERER" ]] || fail "Missing renderer: ${TERMINAL_RENDERER#$ROOT/}"
check_contains "$TERMINAL_RENDERER" "./assets/rinawarp-logo.png" "Desktop RinaWarp logo"
check_not_contains "$TERMINAL_RENDERER" "rina-unicorn-logo.png" "Desktop unicorn logo"

echo "✅ Branding guard passed"
