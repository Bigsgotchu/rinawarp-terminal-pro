#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
REPO="${GITHUB_REPOSITORY:-Bigsgotchu/rinawarp-terminal-pro}"
UPDATER_BASE_URL="${UPDATER_BASE_URL:-https://github.com/$REPO/releases/latest/download}"
EXPECTED_VERSION="${EXPECTED_VERSION:-$(node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$APP_DIR/package.json','utf8')); process.stdout.write(pkg.version)")}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  echo "[check:updater] $1" >&2
  exit 1
}

trim_slash() {
  printf '%s' "$1" | sed 's#/*$##'
}

BASE_URL="$(trim_slash "$UPDATER_BASE_URL")"
LATEST_LINUX_URL="${1:-$BASE_URL/latest-linux.yml}"
LATEST_JSON_URL="${LATEST_LINUX_URL%/*}/latest.json"

fetch_headers_and_body() {
  local url="$1"
  local header_file="$2"
  local body_file="$3"
  curl -fsSL --max-time 30 -D "$header_file" -o "$body_file" "$url" || return 1
}

assert_not_html() {
  local _header_file="$1"
  local body_file="$2"
  local label="$3"
  if head -c 256 "$body_file" | grep -qiE '<!doctype html|<html'; then
    fail "$label body looks like HTML instead of an updater artifact"
  fi
}

resolve_url() {
  node -e '
    const base = process.argv[1]
    const value = process.argv[2]
    if (!value) process.exit(2)
    try {
      console.log(new URL(value, base).toString())
    } catch {
      process.exit(2)
    }
  ' "$1" "$2"
}

extract_yaml_scalar() {
  node -e '
    const fs = require("fs")
    const key = process.argv[2]
    const text = fs.readFileSync(process.argv[1], "utf8")
    const match = text.match(new RegExp("^" + key + ":\\s*(.+)$", "m"))
    if (!match) process.exit(2)
    process.stdout.write(match[1].trim().replace(/^["\x27]|["\x27]$/g, ""))
  ' "$1" "$2"
}

extract_appimage_path() {
  node -e '
    const fs = require("fs")
    const text = fs.readFileSync(process.argv[1], "utf8")
    const values = []
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:-\s*)?(?:url|path):\s*(.+?)\s*$/)
      if (match) values.push(match[1].trim().replace(/^["\x27]|["\x27]$/g, ""))
    }
    const appImage = values.find((value) => /\.AppImage(?:$|[?#])/i.test(value))
    if (!appImage) process.exit(2)
    process.stdout.write(appImage)
  ' "$1"
}

extract_json_asset() {
  node -e '
    const fs = require("fs")
    const kind = process.argv[2]
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
    const entry = data?.files?.[kind]
    const value = entry?.url || entry?.name || entry?.path
    if (!value) process.exit(2)
    process.stdout.write(value)
  ' "$1" "$2"
}

echo "[check:updater] Checking $LATEST_LINUX_URL"
fetch_headers_and_body "$LATEST_LINUX_URL" "$TMP_DIR/latest-linux.headers" "$TMP_DIR/latest-linux.yml" \
  || fail "latest-linux.yml is not reachable: $LATEST_LINUX_URL"
assert_not_html "$TMP_DIR/latest-linux.headers" "$TMP_DIR/latest-linux.yml" "latest-linux.yml"

VERSION="$(extract_yaml_scalar "$TMP_DIR/latest-linux.yml" version)" || fail "latest-linux.yml is missing version"
if [[ "$VERSION" != "$EXPECTED_VERSION" ]]; then
  fail "latest-linux.yml version $VERSION does not match expected version $EXPECTED_VERSION"
fi

APPIMAGE_PATH="$(extract_appimage_path "$TMP_DIR/latest-linux.yml")" || fail "latest-linux.yml does not reference an AppImage"
APPIMAGE_URL="$(resolve_url "$LATEST_LINUX_URL" "$APPIMAGE_PATH")" || fail "Could not resolve AppImage URL"
fetch_headers_and_body "$APPIMAGE_URL" "$TMP_DIR/appimage.headers" "$TMP_DIR/appimage.bin" \
  || fail "AppImage is not reachable: $APPIMAGE_URL"
assert_not_html "$TMP_DIR/appimage.headers" "$TMP_DIR/appimage.bin" "AppImage"

echo "[check:updater] AppImage reachable: $APPIMAGE_URL"

if fetch_headers_and_body "$LATEST_JSON_URL" "$TMP_DIR/latest-json.headers" "$TMP_DIR/latest.json"; then
  assert_not_html "$TMP_DIR/latest-json.headers" "$TMP_DIR/latest.json" "latest.json"
  JSON_VERSION="$(node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(String(data.version || ""))' "$TMP_DIR/latest.json")"
  if [[ "$JSON_VERSION" != "$EXPECTED_VERSION" ]]; then
    fail "latest.json version $JSON_VERSION does not match expected version $EXPECTED_VERSION"
  fi
  if DEB_PATH="$(extract_json_asset "$TMP_DIR/latest.json" deb 2>/dev/null)"; then
    DEB_URL="$(resolve_url "$LATEST_JSON_URL" "$DEB_PATH")" || fail "Could not resolve .deb URL"
    fetch_headers_and_body "$DEB_URL" "$TMP_DIR/deb.headers" "$TMP_DIR/package.deb" \
      || fail ".deb is not reachable: $DEB_URL"
    assert_not_html "$TMP_DIR/deb.headers" "$TMP_DIR/package.deb" ".deb"
    echo "[check:updater] .deb reachable: $DEB_URL"
  fi
else
  fail "latest.json is not reachable: $LATEST_JSON_URL"
fi

echo "[check:updater] Updater feed is reachable and matches v$EXPECTED_VERSION"
